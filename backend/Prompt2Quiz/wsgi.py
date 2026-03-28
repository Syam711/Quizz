import os
from django.core.wsgi import get_wsgi_application
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "Prompt2Quiz.settings")
application = get_wsgi_application()
