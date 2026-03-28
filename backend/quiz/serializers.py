from rest_framework import serializers
from .models import QuizSession, Question, QuizAttempt, QuestionFlag

VALID_MODELS = {
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.5-flash-lite-preview-06-17",
}

DIFFICULTY_LIMITS = {"simple": 15, "complex": 10}


class GenerateQuizSerializer(serializers.Serializer):
    topic = serializers.CharField(
        max_length=2000, min_length=1, trim_whitespace=True,
        error_messages={"blank": "Topic cannot be empty."},
    )
    num_questions = serializers.IntegerField(min_value=1, max_value=50)
    difficulty    = serializers.ChoiceField(choices=["simple", "complex"])
    model         = serializers.ChoiceField(choices=list(VALID_MODELS))
    auto_simplify = serializers.BooleanField(default=False)

    def validate(self, data):
        limit = DIFFICULTY_LIMITS.get(data["difficulty"], 15)
        if data["num_questions"] > limit:
            raise serializers.ValidationError(
                f"Maximum {limit} questions for {data['difficulty']} difficulty."
            )
        return data


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Question
        fields = ["order", "question", "options", "answer",
                  "explanation", "topic", "difficulty_label"]


class QuizSessionSerializer(serializers.ModelSerializer):
    questions       = QuestionSerializer(many=True, read_only=True)
    total_generated = serializers.SerializerMethodField()
    owner_name      = serializers.SerializerMethodField()

    class Meta:
        model  = QuizSession
        fields = [
            "id", "topic", "simplified_topic", "difficulty",
            "model_name", "num_questions", "created_at",
            "questions", "total_generated",
            "share_token", "is_public", "owner_name",
        ]

    def get_total_generated(self, obj):
        return obj.questions.count()

    def get_owner_name(self, obj):
        return obj.user.name if obj.user else "Guest"


class QuizHistorySerializer(serializers.ModelSerializer):
    score      = serializers.SerializerMethodField()
    completed  = serializers.SerializerMethodField()
    percentage = serializers.SerializerMethodField()

    class Meta:
        model  = QuizSession
        fields = ["id", "topic", "difficulty", "model_name",
                  "num_questions", "created_at", "score",
                  "completed", "percentage", "share_token"]

    def get_score(self, obj):
        try:    return obj.attempt.score
        except: return None

    def get_completed(self, obj):
        try:    return obj.attempt.completed
        except: return False

    def get_percentage(self, obj):
        try:
            a = obj.attempt
            if a.completed and obj.num_questions > 0:
                return round(a.score / obj.num_questions * 100)
        except: pass
        return None


class SubmitAnswerSerializer(serializers.Serializer):
    question_order = serializers.IntegerField(min_value=0)
    chosen_index   = serializers.IntegerField(min_value=0, max_value=3, allow_null=True)


class BookmarkSerializer(serializers.Serializer):
    question_order = serializers.IntegerField(min_value=0)
    bookmarked     = serializers.BooleanField()


class FlagSerializer(serializers.Serializer):
    question_order = serializers.IntegerField(min_value=0)
    reason = serializers.ChoiceField(
        choices=["wrong_answer", "bad_question", "off_topic", "other"]
    )
    note = serializers.CharField(max_length=500, required=False, default="")


class ShareSettingsSerializer(serializers.Serializer):
    is_public = serializers.BooleanField()


class QuizAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model  = QuizAttempt
        fields = ["answers", "bookmarks", "flags", "completed",
                  "score", "time_taken_seconds", "suggested_difficulty"]
