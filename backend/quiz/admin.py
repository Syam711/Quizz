from django.contrib import admin
from .models import QuizSession, Question, QuizAttempt, QuestionFlag

class QuestionInline(admin.TabularInline):
    model = Question
    extra = 0
    readonly_fields = ["order","question","options","answer","explanation","topic","flag_count"]

@admin.register(QuizSession)
class QuizSessionAdmin(admin.ModelAdmin):
    list_display   = ["topic","difficulty","model_name","num_questions","created_at","is_public"]
    list_filter    = ["difficulty","model_name","is_public"]
    search_fields  = ["topic","user__email"]
    inlines        = [QuestionInline]

@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ["quiz","order","topic","flag_count","is_hidden"]
    list_filter  = ["is_hidden","difficulty_label"]

@admin.register(QuestionFlag)
class QuestionFlagAdmin(admin.ModelAdmin):
    list_display = ["question","reason","created_at"]
    list_filter  = ["reason"]

@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = ["quiz","score","completed","suggested_difficulty","updated_at"]
    list_filter  = ["completed","suggested_difficulty"]
