import uuid
from django.db   import models
from django.conf import settings


class QuizSession(models.Model):
    DIFFICULTY = [("simple", "Simple"), ("complex", "Complex")]

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user         = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="quizsession_set",
    )
    session_key  = models.CharField(max_length=40, blank=True, db_index=True)
    topic             = models.CharField(max_length=500)
    simplified_topic  = models.CharField(max_length=300, blank=True)
    difficulty        = models.CharField(max_length=10, choices=DIFFICULTY, default="simple")
    model_name        = models.CharField(max_length=100)
    num_questions     = models.PositiveSmallIntegerField()
    created_at        = models.DateTimeField(auto_now_add=True)
    share_token       = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    is_public         = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.topic} ({self.difficulty})"


class Question(models.Model):
    quiz             = models.ForeignKey(QuizSession, on_delete=models.CASCADE, related_name="questions")
    order            = models.PositiveSmallIntegerField()
    question         = models.TextField()
    options          = models.JSONField()          # list[str] — always 4 items
    answer           = models.TextField()
    explanation      = models.TextField()
    topic            = models.CharField(max_length=200)
    difficulty_label = models.CharField(max_length=20, default="")
    flag_count       = models.PositiveSmallIntegerField(default=0)
    is_hidden        = models.BooleanField(default=False)

    class Meta:
        ordering       = ["order"]
        unique_together = [("quiz", "order")]

    def __str__(self):
        return f"Q{self.order}: {self.question[:60]}"


class QuestionFlag(models.Model):
    FLAG_REASONS = [
        ("wrong_answer", "Wrong answer"),
        ("bad_question", "Poorly worded"),
        ("off_topic",    "Off topic"),
        ("other",        "Other"),
    ]
    question    = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="flags")
    user        = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
    )
    session_key = models.CharField(max_length=40, blank=True)
    reason      = models.CharField(max_length=30, choices=FLAG_REASONS)
    note        = models.TextField(blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("question", "user"), ("question", "session_key")]

    def __str__(self):
        return f"Flag on Q{self.question.order}: {self.reason}"


class QuizAttempt(models.Model):
    quiz                 = models.OneToOneField(QuizSession, on_delete=models.CASCADE, related_name="attempt")
    answers              = models.JSONField(default=dict)   # {str(order): int | null}
    bookmarks            = models.JSONField(default=list)
    flags                = models.JSONField(default=list)
    completed            = models.BooleanField(default=False)
    score                = models.PositiveSmallIntegerField(default=0)
    time_taken_seconds   = models.PositiveIntegerField(default=0)
    suggested_difficulty = models.CharField(max_length=10, blank=True)
    updated_at           = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Attempt: {self.quiz} — {self.score}/{self.quiz.num_questions}"
