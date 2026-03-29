import logging
from datetime import timedelta

from django.utils     import timezone
from django.core.cache import cache
from rest_framework.views       import APIView
from rest_framework.response    import Response
from rest_framework             import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.throttling  import SimpleRateThrottle
from django.shortcuts           import get_object_or_404

from .models      import QuizSession, Question, QuizAttempt, QuestionFlag
from .serializers import (
    GenerateQuizSerializer, QuizSessionSerializer, QuizHistorySerializer,
    SubmitAnswerSerializer, BookmarkSerializer, FlagSerializer,
    ShareSettingsSerializer, QuizAttemptSerializer,
)
from . import generator
from accounts.views import update_streak

logger = logging.getLogger(__name__)

# ── Whitelisted emails — full unrestricted access ─────────────────────────────
WHITELISTED_EMAILS = {
    "bashyamshyam123@gmail.com",
}

# ── Quota settings ────────────────────────────────────────────────────────────
IP_QUOTA_LIMIT  = 5          # max quizzes per IP per window
IP_QUOTA_WINDOW = 12 * 3600  # 12 hours in seconds

TOPIC_SUGGESTIONS = {
    "Computer Science": [
        "Python Basics", "Data Structures", "Algorithms", "Operating Systems",
        "Computer Networks", "Database Design", "Object-Oriented Programming",
        "System Design", "Git & Version Control", "Linux Commands",
    ],
    "Mathematics": [
        "Linear Algebra", "Calculus", "Probability & Statistics",
        "Discrete Mathematics", "Number Theory", "Graph Theory",
    ],
    "Web Development": [
        "HTML & CSS", "JavaScript ES6+", "React Hooks", "REST APIs",
        "Django REST Framework", "SQL Queries", "TypeScript",
    ],
    "Science": [
        "Quantum Physics", "Organic Chemistry", "Human Anatomy",
        "Climate Change", "Genetics & DNA", "Newton's Laws",
    ],
    "General Knowledge": [
        "World History", "Geography", "Economics Basics", "Philosophy",
    ],
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_client_ip(request):
    """Extract real IP, respecting reverse-proxy headers (Render uses these)."""
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")


def is_whitelisted(request):
    """Return True if the authenticated user is in the whitelist."""
    return (
        request.user.is_authenticated
        and request.user.email in WHITELISTED_EMAILS
    )


def check_ip_quota(request):
    """
    Returns (allowed: bool, remaining: int, reset_in_seconds: int).
    Uses Django's cache backend (memory by default, works on single-instance Render).
    """
    if is_whitelisted(request):
        return True, IP_QUOTA_LIMIT, 0

    ip  = get_client_ip(request)
    key = f"ip_quota_{ip}"
    ttl_key = f"ip_quota_ttl_{ip}"

    count = cache.get(key, 0)
    if count >= IP_QUOTA_LIMIT:
        # Calculate seconds until reset
        reset_in = cache.ttl(ttl_key) if hasattr(cache, "ttl") else IP_QUOTA_WINDOW
        return False, 0, reset_in or IP_QUOTA_WINDOW

    # Increment counter; set expiry only on first use
    if count == 0:
        cache.set(key, 1, IP_QUOTA_WINDOW)
        cache.set(ttl_key, True, IP_QUOTA_WINDOW)
    else:
        cache.incr(key)

    remaining = IP_QUOTA_LIMIT - (count + 1)
    return True, remaining, 0


# ── Throttles ─────────────────────────────────────────────────────────────────

class GenerateBurstThrottle(SimpleRateThrottle):
    """3 generations per minute per IP/user (burst protection)."""
    scope = "generate_burst"

    def get_cache_key(self, request, view):
        ident = (
            str(request.user.pk)
            if request.user.is_authenticated
            else self.get_ident(request)
        )
        return self.cache_format % {"scope": self.scope, "ident": ident}


class GenerateHourlyThrottle(SimpleRateThrottle):
    """20 generations per hour per IP/user."""
    scope = "generate_hourly"

    def get_cache_key(self, request, view):
        ident = (
            str(request.user.pk)
            if request.user.is_authenticated
            else self.get_ident(request)
        )
        return self.cache_format % {"scope": self.scope, "ident": ident}


def _throttle_429(throttle):
    wait        = throttle.wait()
    retry_after = int(wait) + 1 if wait else 60
    return Response(
        {"error": f"Too many requests. Wait {retry_after}s.", "retry_after": retry_after},
        status=status.HTTP_429_TOO_MANY_REQUESTS,
        headers={"Retry-After": str(retry_after)},
    )


def _ensure_session(request):
    if not request.session.session_key:
        request.session.create()
    return request.session.session_key


def _difficulty_suggestion(results):
    if not results:
        return ""
    pct = sum(1 for r in results if r["correct"]) / len(results)
    return "complex" if pct >= 0.85 else "simple"


# ── Health check ──────────────────────────────────────────────────────────────

class HealthCheckView(APIView):
    """
    GET /api/health/
    Lightweight liveness probe — no DB queries, no auth.
    Used by the frontend to detect cold starts.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({"status": "ok"}, status=status.HTTP_200_OK)


# ── Generate ──────────────────────────────────────────────────────────────────

class GenerateQuizView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        # 1. Burst + hourly throttle
        for ThrottleCls in [GenerateBurstThrottle, GenerateHourlyThrottle]:
            t = ThrottleCls()
            if not t.allow_request(request, self):
                return _throttle_429(t)

        # 2. IP 12-hour quota (5 per IP, bypassed for whitelisted emails)
        allowed, remaining, reset_in = check_ip_quota(request)
        if not allowed:
            hours = reset_in // 3600
            mins  = (reset_in % 3600) // 60
            return Response(
                {
                    "error": (
                        f"You've reached the limit of {IP_QUOTA_LIMIT} quizzes per 12 hours. "
                        f"Try again in {hours}h {mins}m."
                    ),
                    "retry_after": reset_in,
                    "quota_exceeded": True,
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # 3. Validate input
        ser = GenerateQuizSerializer(data=request.data)
        if not ser.is_valid():
            return Response({"errors": ser.errors}, status=status.HTTP_400_BAD_REQUEST)

        d           = ser.validated_data
        session_key = _ensure_session(request)

        # 4. Generate
        try:
            result = generator.generate(
                topic         = d["topic"],
                model         = d["model"],
                num_questions = d["num_questions"],
                difficulty    = d["difficulty"],
                auto_simplify = d.get("auto_simplify", False),
            )
        except EnvironmentError as e:
            logger.error(str(e))
            return Response({"error": "Server configuration error."}, status=500)
        except ValueError as e:
            return Response({"error": str(e)}, status=400)
        except RuntimeError as e:
            logger.error(str(e))
            return Response(
                {"error": str(e), "suggestion": "Try fewer questions or a simpler topic."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception as e:
            logger.exception(e)
            return Response({"error": "Unexpected error. Please try again."}, status=500)

        # 5. Persist
        quiz = QuizSession.objects.create(
            user             = request.user if request.user.is_authenticated else None,
            session_key      = session_key,
            topic            = d["topic"],
            simplified_topic = result.problems[0]["topic"] if result.problems else d["topic"],
            difficulty       = d["difficulty"],
            model_name       = result.model_used,
            num_questions    = len(result.problems),
        )
        Question.objects.bulk_create([
            Question(
                quiz             = quiz,
                order            = i,
                question         = p["question"],
                options          = p["options"],
                answer           = p["answer"],
                explanation      = p["explanation"],
                topic            = p["topic"],
                difficulty_label = p.get("difficulty_label", d["difficulty"]),
            )
            for i, p in enumerate(result.problems)
        ])
        QuizAttempt.objects.create(quiz=quiz)

        return Response(
            {
                **QuizSessionSerializer(quiz).data,
                "warnings":        result.warnings,
                "model_used":      result.model_used,
                "fallbacks_used":  result.fallbacks_used,
                "quota_remaining": remaining,
            },
            status=status.HTTP_201_CREATED,
        )


# ── Detail / Shared ───────────────────────────────────────────────────────────

class QuizDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, quiz_id):
        session_key = _ensure_session(request)
        quiz        = get_object_or_404(QuizSession, id=quiz_id)
        is_owner    = request.user.is_authenticated and quiz.user == request.user
        if not (is_owner or quiz.session_key == session_key or quiz.is_public):
            return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        attempt, _ = QuizAttempt.objects.get_or_create(quiz=quiz)
        return Response({
            "quiz":    QuizSessionSerializer(quiz).data,
            "attempt": QuizAttemptSerializer(attempt).data,
        })


class SharedQuizView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, share_token):
        quiz = get_object_or_404(QuizSession, share_token=share_token, is_public=True)
        return Response(QuizSessionSerializer(quiz).data)


# ── Answer ────────────────────────────────────────────────────────────────────

class SubmitAnswerView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, quiz_id):
        session_key = _ensure_session(request)
        quiz        = get_object_or_404(QuizSession, id=quiz_id)
        is_owner    = request.user.is_authenticated and quiz.user == request.user
        if not (is_owner or quiz.session_key == session_key):
            return Response({"error": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
        attempt, _ = QuizAttempt.objects.get_or_create(quiz=quiz)
        if attempt.completed:
            return Response({"error": "Already submitted."}, status=400)
        ser = SubmitAnswerSerializer(data=request.data)
        if not ser.is_valid():
            return Response({"errors": ser.errors}, status=400)
        order  = str(ser.validated_data["question_order"])
        chosen = ser.validated_data["chosen_index"]
        if not quiz.questions.filter(order=ser.validated_data["question_order"]).exists():
            return Response({"error": "Invalid question order."}, status=400)
        attempt.answers[order] = chosen
        attempt.save(update_fields=["answers", "updated_at"])
        return Response({"saved": True})


# ── Bookmark ──────────────────────────────────────────────────────────────────

class BookmarkView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, quiz_id):
        quiz       = get_object_or_404(QuizSession, id=quiz_id)
        attempt, _ = QuizAttempt.objects.get_or_create(quiz=quiz)
        ser = BookmarkSerializer(data=request.data)
        if not ser.is_valid():
            return Response({"errors": ser.errors}, status=400)
        order = ser.validated_data["question_order"]
        bm    = set(attempt.bookmarks)
        bm.add(order) if ser.validated_data["bookmarked"] else bm.discard(order)
        attempt.bookmarks = sorted(bm)
        attempt.save(update_fields=["bookmarks", "updated_at"])
        return Response({"bookmarks": attempt.bookmarks})


# ── Flag ──────────────────────────────────────────────────────────────────────

class FlagView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, quiz_id):
        session_key = _ensure_session(request)
        ser = FlagSerializer(data=request.data)
        if not ser.is_valid():
            return Response({"errors": ser.errors}, status=400)
        quiz     = get_object_or_404(QuizSession, id=quiz_id)
        question = get_object_or_404(Question, quiz=quiz, order=ser.validated_data["question_order"])
        if request.user.is_authenticated:
            _, created = QuestionFlag.objects.get_or_create(
                question=question, user=request.user,
                defaults={"reason": ser.validated_data["reason"], "note": ser.validated_data.get("note", "")},
            )
        else:
            _, created = QuestionFlag.objects.get_or_create(
                question=question, session_key=session_key,
                defaults={"reason": ser.validated_data["reason"], "note": ser.validated_data.get("note", "")},
            )
        if created:
            question.flag_count += 1
            if question.flag_count >= 5:
                question.is_hidden = True
            question.save(update_fields=["flag_count", "is_hidden"])
        return Response({"flagged": created, "flag_count": question.flag_count})


# ── Finish ────────────────────────────────────────────────────────────────────

class FinishQuizView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, quiz_id):
        session_key = _ensure_session(request)
        quiz        = get_object_or_404(QuizSession, id=quiz_id)
        is_owner    = request.user.is_authenticated and quiz.user == request.user
        if not (is_owner or quiz.session_key == session_key):
            return Response({"error": "Forbidden."}, status=403)
        attempt, _ = QuizAttempt.objects.get_or_create(quiz=quiz)
        if attempt.completed:
            return Response({"error": "Already submitted."}, status=400)

        time_taken = request.data.get("time_taken_seconds", 0)
        questions  = list(quiz.questions.all())
        score      = 0
        results    = []

        for q in questions:
            chosen_idx = attempt.answers.get(str(q.order))
            correct    = (
                chosen_idx is not None
                and isinstance(chosen_idx, int)
                and 0 <= chosen_idx < len(q.options)
                and q.options[chosen_idx] == q.answer
            )
            if correct:
                score += 1
            results.append({
                "order": q.order, "question": q.question,
                "options": q.options, "answer": q.answer,
                "explanation": q.explanation, "topic": q.topic,
                "difficulty_label": q.difficulty_label,
                "chosen_index": chosen_idx, "correct": correct,
            })

        suggested = _difficulty_suggestion(results)
        attempt.score                = score
        attempt.completed            = True
        attempt.time_taken_seconds   = time_taken
        attempt.suggested_difficulty = suggested
        attempt.save(update_fields=["score","completed","time_taken_seconds","suggested_difficulty","updated_at"])

        if request.user.is_authenticated:
            update_streak(request.user)

        return Response({
            "score": score, "total": len(questions),
            "percentage": round(score / len(questions) * 100) if questions else 0,
            "results": results, "bookmarks": attempt.bookmarks,
            "suggested_difficulty": suggested, "time_taken_seconds": time_taken,
        })


# ── Share ─────────────────────────────────────────────────────────────────────

class ShareView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, quiz_id):
        quiz = get_object_or_404(QuizSession, id=quiz_id, user=request.user)
        ser  = ShareSettingsSerializer(data=request.data)
        if not ser.is_valid():
            return Response({"errors": ser.errors}, status=400)
        quiz.is_public = ser.validated_data["is_public"]
        quiz.save(update_fields=["is_public"])
        return Response({"is_public": quiz.is_public, "share_token": str(quiz.share_token)})


# ── History ───────────────────────────────────────────────────────────────────

class QuizHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        quizzes  = QuizSession.objects.filter(user=request.user).prefetch_related("attempt")
        page     = max(1, int(request.query_params.get("page", 1)))
        per_page = 12
        start    = (page - 1) * per_page
        total    = quizzes.count()
        return Response({
            "quizzes": QuizHistorySerializer(quizzes[start:start + per_page], many=True).data,
            "total": total, "page": page,
            "pages": max(1, (total + per_page - 1) // per_page),
        })


# ── Topics ────────────────────────────────────────────────────────────────────

class TopicSuggestionsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(TOPIC_SUGGESTIONS)


# ── Simplify ──────────────────────────────────────────────────────────────────

class SimplifyTopicView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        import os
        raw = request.data.get("topic", "").strip()
        if not raw:
            return Response({"error": "No topic provided."}, status=400)
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return Response({"simplified": raw, "original": raw})
        simplified = generator.simplify_topic_with_ai(raw, api_key)
        return Response({"simplified": simplified, "original": raw})