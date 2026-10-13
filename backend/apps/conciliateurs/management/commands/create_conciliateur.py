from django.core.exceptions import ValidationError
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
        parser.add_argument("--department", required=True, help="Code département, ex. 69 ou 2A.")
        parser.add_argument("--bio", default="")
        parser.add_argument("--unverified", action="store_true", help="Leave the account unverified (default: verified).")

    def handle(self, *args, email, password, first_name, last_name, city, department, bio, unverified, **options):
        if User.objects.filter(email__iexact=email).exists():
            raise CommandError(f"{email} already exists.")
        profile = ConciliateurProfile(city=city, department=department, bio=bio, is_verified=not unverified)
        try:
            profile.clean_fields(exclude=["user"])
        except ValidationError as e:
            raise CommandError(e)
        with transaction.atomic():
            user = User.objects.create_user(email, password, role=User.Role.CONCILIATEUR, first_name=first_name, last_name=last_name)
            profile.user = user
            profile.save()
        self.stdout.write(self.style.SUCCESS(f"Conciliateur {email} created ({'unverified' if unverified else 'verified'})."))
