from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering        = ["email"]
    list_display    = ["email", "display_name", "current_streak", "date_joined", "is_staff"]
    search_fields   = ["email", "display_name"]
    list_filter     = ["is_staff", "is_active"]

    # Override fieldsets — no username field
    fieldsets = (
        (None,          {"fields": ("email", "password")}),
        ("Profile",     {"fields": ("display_name", "avatar_url")}),
        ("Streak",      {"fields": ("current_streak", "longest_streak", "last_quiz_date")}),
        ("Preferences", {"fields": ("preferred_difficulty", "preferred_model", "preferred_num_questions")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields":  ("email", "password1", "password2", "is_staff", "is_active"),
        }),
    )
    # Required by BaseUserAdmin when there's no username
    filter_horizontal = ("groups", "user_permissions")

