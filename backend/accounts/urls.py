from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path("google/",          views.GoogleLoginView.as_view(),  name="google-login"),
    path("token/refresh/",   TokenRefreshView.as_view(),       name="token-refresh"),
    path("profile/",         views.UserProfileView.as_view(),  name="user-profile"),
]
