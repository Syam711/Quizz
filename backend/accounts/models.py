from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user  = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom user model using email as the unique identifier.
    Inherits from AbstractBaseUser (not AbstractUser) to avoid
    the built-in username field entirely.
    """
    email        = models.EmailField(unique=True)
    display_name = models.CharField(max_length=120, blank=True)
    avatar_url   = models.URLField(blank=True, default="")

    is_active  = models.BooleanField(default=True)
    is_staff   = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    # Streak tracking
    current_streak = models.PositiveIntegerField(default=0)
    longest_streak = models.PositiveIntegerField(default=0)
    last_quiz_date = models.DateField(null=True, blank=True)

    # Saved preferences
    preferred_difficulty    = models.CharField(max_length=10, default="simple")
    preferred_model         = models.CharField(max_length=100, default="gemini-2.5-flash")
    preferred_num_questions = models.PositiveSmallIntegerField(default=5)

    USERNAME_FIELD  = "email"
    REQUIRED_FIELDS = []          # no extra required fields for createsuperuser
    objects         = UserManager()

    class Meta:
        verbose_name        = "User"
        verbose_name_plural = "Users"

    def __str__(self):
        return self.display_name or self.email

    @property
    def name(self):
        return self.display_name or self.email.split("@")[0]