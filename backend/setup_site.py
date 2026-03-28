import os
import sys

import django
django.setup()

# ALL model imports MUST come after django.setup()
from django.contrib.sites.models import Site
from allauth.socialaccount.models import SocialApp

# ── Site ──────────────────────────────────────────────────────────────────────
domain = os.environ.get("ALLOWED_HOSTS", "localhost").split(",")[0].strip()

site, created = Site.objects.get_or_create(id=1)
site.domain = domain
site.name   = domain
site.save()
print(f"{'Created' if created else 'Updated'} site: {domain}")

# ── Google SocialApp ──────────────────────────────────────────────────────────
client_id = os.environ.get("GOOGLE_CLIENT_ID", "")
secret    = os.environ.get("GOOGLE_CLIENT_SECRET", "")

if not client_id or not secret:
    print("WARNING: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set — skipping.")
    sys.exit(0)

app, created = SocialApp.objects.get_or_create(
    provider="google",
    defaults={
        "name":      "Google",
        "client_id": client_id,
        "secret":    secret,
    },
)

if not created:
    app.client_id = client_id
    app.secret    = secret
    app.save()

app.sites.add(site)
print(f"{'Created' if created else 'Updated'} Google SocialApp linked to {domain}")
print("Setup complete.")