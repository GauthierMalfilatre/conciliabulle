from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.accounts.models import User
from apps.conciliateurs.models import ConciliateurProfile


class Command(BaseCommand):
    help = "Create a conciliateur account (there is no public registration for conciliateurs)."

    def add_arguments(self, parser):
        parser.add_argument("email")
        parser.add_argument("--password", required=True)
        parser.add_argument("--first-name", default="")
        parser.add_argument("--last-name", default="")
        parser.add_argument("--city", required=True)
        parser.add_argument("--bio", default="")
        parser.add_argument("--unverified", action="store_true", help="Leave the account unverified (default: verified).")

    def handle(self, *args, email, password, first_name, last_name, city, bio, unverified, **options):
        if User.objects.filter(email__iexact=email).exists():
            raise CommandError(f"{email} already exists.")
        with transaction.atomic():
            user = User.objects.create_user(email, password, role=User.Role.CONCILIATEUR, first_name=first_name, last_name=last_name)
            ConciliateurProfile.objects.create(user=user, city=city, bio=bio, is_verified=not unverified)
        self.stdout.write(self.style.SUCCESS(f"Conciliateur {email} created ({'unverified' if unverified else 'verified'})."))
