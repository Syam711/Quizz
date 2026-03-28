from datetime import date, timedelta
import logging

from rest_framework.views       import APIView
from rest_framework.response    import Response
from rest_framework.permissions import IsAuthenticated

from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView

from .models       import User
from .serializers  import UserProfileSerializer, UpdatePreferencesSerializer

logger = logging.getLogger(__name__)


class GoogleLoginView(SocialLoginView):
    """Accepts Google credential/access_token, returns JWT pair."""
    adapter_class = GoogleOAuth2Adapter
    callback_url  = "postmessage"          # for one-tap / credential flow
    client_class  = OAuth2Client


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UpdatePreferencesSerializer(
            request.user, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(UserProfileSerializer(request.user).data)
        return Response(serializer.errors, status=400)


def update_streak(user: User) -> None:
    """
    Called after every completed quiz for an authenticated user.
    Updates current_streak and longest_streak.
    """
    today = date.today()

    if user.last_quiz_date is None:
        user.current_streak = 1
    elif user.last_quiz_date == today:
        pass  # already done today — no change
    elif user.last_quiz_date == today - timedelta(days=1):
        user.current_streak += 1
    else:
        user.current_streak = 1  # streak broken

    user.last_quiz_date = today
    if user.current_streak > user.longest_streak:
        user.longest_streak = user.current_streak

    user.save(update_fields=["current_streak", "longest_streak", "last_quiz_date"])
