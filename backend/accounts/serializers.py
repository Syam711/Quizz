from rest_framework import serializers
from .models import User


class UserProfileSerializer(serializers.ModelSerializer):
    name         = serializers.ReadOnlyField()
    total_quizzes = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = [
            "id", "email", "name", "display_name", "avatar_url",
            "current_streak", "longest_streak", "last_quiz_date",
            "preferred_difficulty", "preferred_model", "preferred_num_questions",
            "total_quizzes", "date_joined",
        ]
        read_only_fields = [
            "id", "email", "current_streak", "longest_streak",
            "last_quiz_date", "date_joined",
        ]

    def get_total_quizzes(self, obj):
        return obj.quizsession_set.filter(attempt__completed=True).count()


class UpdatePreferencesSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = [
            "display_name", "preferred_difficulty",
            "preferred_model", "preferred_num_questions",
        ]
