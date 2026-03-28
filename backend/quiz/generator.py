"""
generator.py — batched Gemini generation with model fallback cascade.

Difficulty is now two values only:
  simple  → clear, single-concept questions
  complex → nuanced, multi-step reasoning questions

No ratio dictionaries. Difficulty keyword injected into prompt.
"""
import os
import re
import logging
from pydantic import BaseModel, Field
from google import genai

logger = logging.getLogger(__name__)

BATCH_SIZE  = 3
MAX_RETRIES = 2
MAX_TOPIC_LEN = 300

MODEL_CASCADE = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite-preview-06-17",
    "gemini-2.5-pro",
]
VALID_MODELS = set(MODEL_CASCADE)

DIFFICULTY_INSTRUCTIONS = {
    "simple": (
        "Use clear, direct language. Each question should test a single concept. "
        "Avoid ambiguous phrasing. Distractors should be plausible but clearly wrong "
        "on reflection. Suitable for learners new to the topic."
    ),
    "complex": (
        "Use nuanced, multi-step reasoning. Include scenario-based questions, edge cases, "
        "and tricky distractors that require genuine understanding to dismiss. "
        "Questions may test the interplay between multiple concepts. "
        "Suitable for learners already familiar with the topic."
    ),
}

_FILLER_RE = re.compile(
    r"^\s*(?:can you\s+|please\s+|generate\s+|create\s+|make\s+|give me\s+|"
    r"i want\s+|i need\s+|a quiz (?:on|about)\s+|"
    r"questions? (?:on|about)\s+|quiz (?:on|about)\s+)+",
    re.IGNORECASE,
)

_INJECTION_RE = re.compile(
    r"ignore\s+(previous|all|prior)\s+instructions?|"
    r"you are now|forget everything|system prompt|jailbreak|"
    r"act as\b|pretend (you are|to be)",
    re.IGNORECASE,
)


# ── Pydantic schema ────────────────────────────────────────────────────────────

class Problem(BaseModel):
    question: str = Field(description=(
        "The question text. Preserve code blocks, LaTeX formatting, and indentation exactly."
    ))
    options: list[str] = Field(
        description="Exactly 4 answer options.",
        min_length=4, max_length=4,
    )
    answer: str = Field(description="The correct option — must match verbatim from options list.")
    explanation: str = Field(description=(
        "Why the answer is correct. Max 3 sentences. Preserve code/LaTeX formatting."
    ))
    topic: str = Field(description="The specific sub-topic this question tests.")
    difficulty_label: str = Field(description="One of: simple, complex")


class ProblemSet(BaseModel):
    problems: list[Problem]


# ── Query sanitisation ────────────────────────────────────────────────────────

def sanitise_topic(raw: str) -> tuple[str, list[str]]:
    warnings: list[str] = []
    topic = raw.strip()

    if not topic:
        raise ValueError("Topic cannot be empty.")

    if _INJECTION_RE.search(topic):
        raise ValueError("Topic contains disallowed content. Please enter a genuine subject.")

    # Strip filler words iteratively
    while True:
        stripped = _FILLER_RE.sub("", topic).strip()
        if stripped == topic:
            break
        topic = stripped

    if not topic:
        raise ValueError("Topic is too vague. Please be more specific.")

    if len(topic) > MAX_TOPIC_LEN:
        topic = topic[:MAX_TOPIC_LEN].rsplit(" ", 1)[0]
        warnings.append(f"Topic truncated to {MAX_TOPIC_LEN} characters.")

    topic = re.sub(r"\s+", " ", topic)
    return topic, warnings


def simplify_topic_with_ai(raw_topic: str, api_key: str) -> str:
    prompt = (
        f"Distil the following into a concise quiz topic phrase (max 10 words, no punctuation):\n\n"
        f'"{raw_topic}"\n\nReturn only the topic phrase, nothing else.'
    )
    try:
        client = genai.Client(api_key=api_key)
        resp = client.models.generate_content(
            model="gemini-2.5-flash-lite-preview-06-17",
            contents=prompt,
        )
        s = resp.text.strip().strip('"').strip("'")
        if s and len(s) < 200:
            return s
    except Exception as e:
        logger.warning(f"Topic simplification failed: {e}")
    return raw_topic


# ── Validation ────────────────────────────────────────────────────────────────

DIFFICULTY_LIMITS = {"simple": 15, "complex": 10}

def validate_inputs(topic: str, model: str, num_questions: int, difficulty: str):
    if model not in VALID_MODELS:
        raise ValueError(f"Invalid model. Choose from: {', '.join(sorted(VALID_MODELS))}")
    if difficulty not in DIFFICULTY_INSTRUCTIONS:
        raise ValueError("Difficulty must be 'simple' or 'complex'.")
    limit = DIFFICULTY_LIMITS[difficulty]
    if not isinstance(num_questions, int) or not (1 <= num_questions <= limit):
        raise ValueError(f"Number of questions must be between 1 and {limit} for {difficulty} difficulty.")


# ── Prompt builder ────────────────────────────────────────────────────────────

def _build_prompt(
    topic: str,
    batch_size: int,
    difficulty: str,
    batch_idx: int,
    total_batches: int,
) -> str:
    diff_instruction = DIFFICULTY_INSTRUCTIONS[difficulty]
    batch_note = (
        f" (batch {batch_idx + 1}/{total_batches} — do not repeat questions from earlier batches)"
        if total_batches > 1 else ""
    )
    return (
        f"Generate exactly {batch_size} multiple-choice quiz questions about: '{topic}'{batch_note}.\n\n"
        f"Difficulty — {difficulty}: {diff_instruction}\n\n"
        f"Rules:\n"
        f"- Each question must have exactly 4 options.\n"
        f"- The 'answer' field must be verbatim text of one of the options.\n"
        f"- Set difficulty_label to '{difficulty}' for all questions in this batch.\n"
        f"- Vary question style: definitions, application, code snippets, comparison, scenario.\n"
        f"- Preserve LaTeX and code block formatting in question and explanation fields.\n"
        f"- Do not include trivially obvious questions."
    )


# ── Batch generation with fallback cascade ────────────────────────────────────

class GenerationResult:
    def __init__(self, problems, model_used, warnings, fallbacks_used):
        self.problems      = problems
        self.model_used    = model_used
        self.warnings      = warnings
        self.fallbacks_used = fallbacks_used


def _try_batch(
    client,
    model_cascade: list[str],
    prompt: str,
) -> tuple[list[Problem], str, list[str]]:
    """
    Try generating one batch using the model cascade.
    Returns (problems, model_used, fallbacks_triggered).
    Raises RuntimeError if all models fail.
    """
    fallbacks: list[str] = []
    errors:    list[str] = []

    for attempt_idx, model in enumerate(model_cascade):
        if attempt_idx > 0:
            fallbacks.append(model)

        for retry in range(MAX_RETRIES):
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config={
                        "response_mime_type": "application/json",
                        "response_schema": ProblemSet,
                    },
                )
                problems = response.parsed.problems
                valid = [
                    p for p in problems
                    if p.answer in p.options and len(p.options) == 4
                ]
                if not valid:
                    raise ValueError("All returned questions were malformed.")
                logger.info(f"Batch OK — model={model} attempt={retry + 1}")
                return valid, model, fallbacks

            except Exception as e:
                err = f"{type(e).__name__}: {e}"
                errors.append(f"{model} attempt {retry + 1}: {err}")
                logger.warning(f"Generation failed — {model} retry {retry + 1}: {e}")

    raise RuntimeError(
        "All models failed after exhausting the fallback cascade.\n"
        "Errors:\n" + "\n".join(errors)
    )


def generate(
    topic: str,
    model: str,
    num_questions: int,
    difficulty: str,
    auto_simplify: bool = False,
) -> GenerationResult:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise EnvironmentError("GEMINI_API_KEY is not set.")

    validate_inputs(topic, model, num_questions, difficulty)
    cleaned, warnings = sanitise_topic(topic)

    if auto_simplify and len(cleaned) > 80:
        simplified = simplify_topic_with_ai(cleaned, api_key)
        if simplified != cleaned:
            warnings.append(f'Topic simplified to: "{simplified}"')
            cleaned = simplified

    client = genai.Client(api_key=api_key)

    # Build cascade starting from user's preferred model
    cascade = [model] + [m for m in MODEL_CASCADE if m != model]

    # Split into batches of BATCH_SIZE
    batch_sizes = []
    remaining = num_questions
    while remaining > 0:
        batch_sizes.append(min(BATCH_SIZE, remaining))
        remaining -= BATCH_SIZE

    all_problems: list[Problem] = []
    final_model = model
    all_fallbacks: list[str] = []

    for i, bs in enumerate(batch_sizes):
        prompt = _build_prompt(cleaned, bs, difficulty, i, len(batch_sizes))
        batch, used, fallbacks = _try_batch(client, cascade, prompt)
        all_problems.extend(batch)
        final_model = used
        for f in fallbacks:
            if f not in all_fallbacks:
                all_fallbacks.append(f)
        if fallbacks:
            warnings.append(f"Batch {i + 1}: switched to {used} after fallback.")

    return GenerationResult(
        problems=[p.model_dump() for p in all_problems],
        model_used=final_model,
        warnings=warnings,
        fallbacks_used=all_fallbacks,
    )
