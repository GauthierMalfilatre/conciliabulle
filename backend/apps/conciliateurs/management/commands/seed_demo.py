from datetime import time, timedelta
from unittest import mock

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.accounts.models import User
from apps.appointments import services as appointments
from apps.appointments.models import Appointment
from apps.candidatures.models import Candidature
from apps.conciliateurs import services as slots
from apps.conciliateurs.models import Availability, ConciliateurProfile, Slot
from apps.notifications.models import Notification

DOMAIN = "@demo.fr"  # every demo account ends with it, so --reset only touches demo data
PASSWORD = "Demo-pass-2026!"

# email, first name, last name, city, département, verified, bio, instructions, weekly rules (weekday 0=Monday, start, end, minutes, location)
CONCILIATEURS = [
    ("jean.martin", "Jean", "Martin", "Lyon", "69", True, "Ancien notaire, conciliateur depuis 2019.", "",
     [(0, "09:00", "12:00", 60, "Mairie du 3e arrondissement, salle des permanences"), (3, "14:00", "17:00", 30, "Mairie du 3e arrondissement, salle des permanences")]),
    ("sophie.bernard", "Sophie", "Bernard", "Villeurbanne", "69", True, "Ancienne cadre de la fonction publique.", "Apportez votre pièce d'identité et les courriers échangés avec l'autre partie.",
     [(1, "10:00", "13:00", 45, "Maison de justice et du droit, 12 rue de la République")]),
    ("paul.attente", "Paul", "Attente", "Lyon", "69", False, "Candidat validé par l'association, en attente de vérification.", "",
     [(2, "14:00", "16:00", 60, "Mairie du 6e arrondissement")]),
    ("claire.dubois", "Claire", "Dubois", "Paris", "75", True, "Ancienne avocate.", "",
     [(0, "14:00", "18:00", 60, "Mairie du 11e arrondissement"), (4, "09:00", "12:00", 60, "Mairie du 11e arrondissement")]),
    ("marc.leroy", "Marc", "Leroy", "Marseille", "13", True, "Ancien huissier de justice.", "",
     [(3, "09:00", "12:00", 30, "Maison de justice et du droit, quartier Belsunce")]),
    ("anna.santoni", "Anna", "Santoni", "Ajaccio", "2A", True, "Ancienne greffière.", "",
     [(1, "14:00", "17:00", 60, "Mairie d'Ajaccio, salle 2")]),
]

# first name, last name, phone
PLAIGNANTS = [
    ("Alice", "Durand", "06 12 34 56 78"),
    ("Karim", "Benali", "06 98 76 54 32"),
    ("Julie", "Petit", "07 11 22 33 44"),
    ("Thomas", "Moreau", "06 55 44 33 22"),
    ("Nadia", "Lefèvre", "07 66 77 88 99"),
]

# plaignant index, conciliateur index, n-th free slot (from 3 days ahead), motive
APPOINTMENTS = [
    (0, 0, 0, "Conflit de voisinage (haie mitoyenne)"),
    (1, 0, 2, "Litige avec un artisan"),
    (2, 1, 1, "Loyer impayé"),
    (3, 3, 0, "Dépôt de garantie non restitué"),
    (4, 4, 1, "Dette entre particuliers"),
    (0, 5, 0, "Désaccord de succession"),
]


class Command(BaseCommand):
    help = "Load demo data (conciliateurs, plaignants, slots, appointments, notifications, candidatures). Dev only."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Delete the existing demo data first (accounts ending with @demo.fr).")

    def handle(self, *args, reset, **options):
        if not (settings.DEBUG or settings.DEMO_DATA):
            raise CommandError("Refusing to create accounts with a known password unless DEBUG or DEMO_DATA is on.")
        if reset:
            self._delete_demo_data()
        elif User.objects.filter(email__endswith=DOMAIN).exists():
            raise CommandError("Demo data already exists. Use --reset to recreate it.")
        # Alert e-mails are not sent for seeded events (they would flood the console).
        with mock.patch("apps.notifications.services._send_email"), transaction.atomic():
            self._create()
        self._summary()

    def _delete_demo_data(self):
        Appointment.objects.filter(Q(user__email__endswith=DOMAIN) | Q(slot__conciliateur__user__email__endswith=DOMAIN)).delete()  # PROTECT on slots
        User.objects.filter(email__endswith=DOMAIN).delete()  # cascades profiles, rules, slots, notifications
        Candidature.objects.filter(email__endswith=DOMAIN).delete()

    def _create(self):
        User.objects.create_superuser(f"admin{DOMAIN}", PASSWORD)
        profiles = []
        for email, first, last, city, dept, verified, bio, instructions, rules in CONCILIATEURS:
            user = User.objects.create_user(f"{email}{DOMAIN}", PASSWORD, role=User.Role.CONCILIATEUR, first_name=first, last_name=last)
            profile = ConciliateurProfile.objects.create(user=user, city=city, department=dept, bio=bio, instructions=instructions, is_verified=verified)
            for weekday, start, end, minutes, location in rules:
                rule = Availability.objects.create(
                    conciliateur=profile, weekday=weekday, start_time=time.fromisoformat(start), end_time=time.fromisoformat(end), slot_minutes=minutes, location=location
                )
                slots.materialize(rule)
            profiles.append(profile)

        # One isolated slot, not coming from a recurring rule.
        first = profiles[0]
        start = (timezone.now() + timedelta(days=10)).replace(hour=17, minute=0, second=0, microsecond=0)
        Slot.objects.create(conciliateur=first, start=start, end=start + timedelta(hours=1), location="Permanence exceptionnelle, mairie du 3e")

        plaignants = [
            User.objects.create_user(f"{first.lower()}.{last.lower().replace('è', 'e')}{DOMAIN}", PASSWORD, first_name=first, last_name=last)
            for first, last, _ in PLAIGNANTS
        ]
        booked = []
        for p, c, nth, motive in APPOINTMENTS:
            free = profiles[c].slots.free().filter(start__gt=timezone.now() + timedelta(days=3)).order_by("start")
            first_name, last_name, phone = PLAIGNANTS[p]
            booked.append(appointments.book(plaignants[p], free[nth], first_name=first_name, last_name=last_name, phone=phone, motive=motive))

        # A cancelled appointment, a changed one, and a past one (history).
        extra_slots = list(profiles[0].slots.free().filter(start__gt=timezone.now() + timedelta(days=3)).order_by("start")[3:6])
        first_name, last_name, phone = PLAIGNANTS[3]
        cancelled = appointments.book(plaignants[3], extra_slots[0], first_name=first_name, last_name=last_name, phone=phone, motive="Annulé par le plaignant")
        appointments.cancel(cancelled)
        appointments.update(booked[0], extra_slots[1], phone="06 12 34 56 79")
        past = timezone.now() - timedelta(days=14)
        past_slot = Slot.objects.create(conciliateur=profiles[0], start=past, end=past + timedelta(hours=1), location="Mairie du 3e arrondissement")
        first_name, last_name, phone = PLAIGNANTS[1]
        Appointment.objects.create(user=plaignants[1], slot=past_slot, first_name=first_name, last_name=last_name, phone=phone, motive="Litige passé")

        # Some alerts already read, others unread.
        oldest = Notification.objects.filter(recipient=profiles[0].user).order_by("created_at", "id").first()
        Notification.objects.filter(pk=oldest.pk).update(read_at=timezone.now())

        Candidature.objects.create(
            first_name="Hélène", last_name="Girard", email=f"helene.girard{DOMAIN}", phone="06 10 20 30 40", department="69",
            message="Magistrate honoraire, je souhaite devenir conciliatrice.", consent=True,
        )
        Candidature.objects.create(
            first_name="Olivier", last_name="Roux", email=f"olivier.roux{DOMAIN}", phone="07 50 60 70 80", department="13", consent=True, handled=True,
        )

    def _summary(self):
        self.stdout.write(self.style.SUCCESS("Demo data created."))
        self.stdout.write(f"Password for every account: {PASSWORD}")
        self.stdout.write(f"  admin (Django /admin/)  : admin{DOMAIN}")
        for email, _first, _last, city, dept, verified, *_ in CONCILIATEURS:
            self.stdout.write(f"  conciliateur {dept:>2} {city:<13}: {email}{DOMAIN}" + ("" if verified else "   (NOT verified: visible only with --authorize-all=yes)"))
        for first, last, _ in PLAIGNANTS:
            self.stdout.write(f"  plaignant               : {first.lower()}.{last.lower().replace('è', 'e')}{DOMAIN}")
