import logging
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


# ── Throttles ─────────────────────────────────────────────────────────────────

class GenerateBurstThrottle(SimpleRateThrottle):
    """3 generations per 5 minutes per IP/user."""
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
        {
            "error":       f"Too many requests. Wait {retry_after}s.",
            "retry_after": retry_after,
        },
        status=status.HTTP_429_TOO_MANY_REQUESTS,
        headers={"Retry-After": str(retry_after)},
    )


def _ensure_session(request):
    if not request.session.session_key:
        request.session.create()
    return request.session.session_key


def _difficulty_suggestion(results: list) -> str:
    if not results:
        return ""
    pct = sum(1 for r in results if r["correct"]) / len(results)
    return "complex" if pct >= 0.85 else "simple"


# ── Generate ──────────────────────────────────────────────────────────────────

class GenerateQuizView(APIView):
    permission_classes = [AllowAny]
    # NOTE: throttle_classes NOT set here — we check manually for custom 429

    def post(self, request):
        # Manual throttle check so we can return retry_after
        for ThrottleCls in [GenerateBurstThrottle, GenerateHourlyThrottle]:
            t = ThrottleCls()
            if not t.allow_request(request, self):
                return _throttle_429(t)

        ser = GenerateQuizSerializer(data=request.data)
        if not ser.is_valid():
            return Response({"errors": ser.errors}, status=status.HTTP_400_BAD_REQUEST)

        d           = ser.validated_data
        session_key = _ensure_session(request)

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
            return Response(
                {"error": "Server configuration error. Contact support."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except RuntimeError as e:
            logger.error(str(e))
            return Response(
                {
                    "error":      str(e),
                    "suggestion": "Try fewer questions or a simpler topic.",
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception as e:
            logger.exception(e)
            return Response(
                {"error": "Unexpected error. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

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
                "warnings":       result.warnings,
                "model_used":     result.model_used,
                "fallbacks_used": result.fallbacks_used,
            },
            status=status.HTTP_201_CREATED,
        )


# ── Detail ────────────────────────────────────────────────────────────────────

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
            return Response({"error": "Quiz already submitted."}, status=status.HTTP_400_BAD_REQUEST)

        ser = SubmitAnswerSerializer(data=request.data)
        if not ser.is_valid():
            return Response({"errors": ser.errors}, status=status.HTTP_400_BAD_REQUEST)

        order  = str(ser.validated_data["question_order"])
        chosen = ser.validated_data["chosen_index"]

        if not quiz.questions.filter(order=ser.validated_data["question_order"]).exists():
            return Response({"error": "Invalid question order."}, status=status.HTTP_400_BAD_REQUEST)

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
            return Response({"errors": ser.errors}, status=status.HTTP_400_BAD_REQUEST)

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
            return Response({"errors": ser.errors}, status=status.HTTP_400_BAD_REQUEST)

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
            return Response({"error": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        attempt, _ = QuizAttempt.objects.get_or_create(quiz=quiz)
        if attempt.completed:
            return Response({"error": "Already submitted."}, status=status.HTTP_400_BAD_REQUEST)

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
                "order":            q.order,
                "question":         q.question,
                "options":          q.options,
                "answer":           q.answer,
                "explanation":      q.explanation,
                "topic":            q.topic,
                "difficulty_label": q.difficulty_label,
                "chosen_index":     chosen_idx,
                "correct":          correct,
            })

        suggested = _difficulty_suggestion(results)
        attempt.score                = score
        attempt.completed            = True
        attempt.time_taken_seconds   = time_taken
        attempt.suggested_difficulty = suggested
        attempt.save(update_fields=[
            "score", "completed", "time_taken_seconds",
            "suggested_difficulty", "updated_at",
        ])

        if request.user.is_authenticated:
            update_streak(request.user)

        return Response({
            "score":                score,
            "total":                len(questions),
            "percentage":           round(score / len(questions) * 100) if questions else 0,
            "results":              results,
            "bookmarks":            attempt.bookmarks,
            "suggested_difficulty": suggested,
            "time_taken_seconds":   time_taken,
        })


# ── Share ─────────────────────────────────────────────────────────────────────

class ShareView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, quiz_id):
        quiz = get_object_or_404(QuizSession, id=quiz_id, user=request.user)
        ser  = ShareSettingsSerializer(data=request.data)
        if not ser.is_valid():
            return Response({"errors": ser.errors}, status=status.HTTP_400_BAD_REQUEST)
        quiz.is_public = ser.validated_data["is_public"]
        quiz.save(update_fields=["is_public"])
        return Response({
            "is_public":   quiz.is_public,
            "share_token": str(quiz.share_token),
        })


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
            "total":   total,
            "page":    page,
            "pages":   max(1, (total + per_page - 1) // per_page),
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
            return Response({"error": "No topic provided."}, status=status.HTTP_400_BAD_REQUEST)
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return Response({"simplified": raw, "original": raw})
        simplified = generator.simplify_topic_with_ai(raw, api_key)
        return Response({"simplified": simplified, "original": raw})
