from django.urls import path
from . import views

urlpatterns = [
    # Health check — must be first, no auth, no DB
    path("health/",                           views.HealthCheckView.as_view()),

    path("quiz/generate/",                    views.GenerateQuizView.as_view()),
    path("quiz/history/",                     views.QuizHistoryView.as_view()),
    path("quiz/simplify/",                    views.SimplifyTopicView.as_view()),
    path("quiz/shared/<uuid:share_token>/",   views.SharedQuizView.as_view()),
    path("quiz/<uuid:quiz_id>/",              views.QuizDetailView.as_view()),
    path("quiz/<uuid:quiz_id>/answer/",       views.SubmitAnswerView.as_view()),
    path("quiz/<uuid:quiz_id>/bookmark/",     views.BookmarkView.as_view()),
    path("quiz/<uuid:quiz_id>/flag/",         views.FlagView.as_view()),
    path("quiz/<uuid:quiz_id>/finish/",       views.FinishQuizView.as_view()),
    path("quiz/<uuid:quiz_id>/share/",        views.ShareView.as_view()),
    path("topics/",                           views.TopicSuggestionsView.as_view()),
]