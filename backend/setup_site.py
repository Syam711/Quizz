from django.core.management.base import BaseCommand
from django.contrib.sites.models import Site
import os


class Command(BaseCommand):
    help = "Sets up the Site record and Google SocialApp for allauth"

    def handle(self, *args, **options):
        # ── Site ──────────────────────────────────────────────────────────────
        domain = os.environ.get("ALLOWED_HOSTS", "localhost").split(",")[0].strip()

        site, created = Site.objects.get_or_create(id=1)
        site.domain = domain
        site.name   = domain
        site.save()
        self.stdout.write(
            self.style.SUCCESS(f"{'Created' if created else 'Updated'} site: {domain}")
        )

        # ── Google SocialApp ──────────────────────────────────────────────────
        client_id = os.environ.get("GOOGLE_CLIENT_ID", "")
        secret    = os.environ.get("GOOGLE_CLIENT_SECRET", "")

        if not client_id or not secret:
            self.stdout.write(
                self.style.WARNING(
                    "GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set — skipping SocialApp setup."
                )
            )
            return

        try:
            from allauth.socialaccount.models import SocialApp

            app, created = SocialApp.objects.get_or_create(
                provider="google",
                defaults={
                    "name":      "Google",
                    "client_id": client_id,
                    "secret":    secret,
                },
            )

            # Update credentials in case they changed
            if not created:
                app.client_id = client_id
                app.secret    = secret
                app.save()

            app.sites.add(site)

            self.stdout.write(
                self.style.SUCCESS(
                    f"{'Created' if created else 'Updated'} Google SocialApp and linked to {domain}"
                )
            )

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"SocialApp setup failed: {e}"))
