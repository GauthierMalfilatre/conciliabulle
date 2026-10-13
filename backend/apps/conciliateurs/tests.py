from datetime import date, datetime, time, timedelta
from datetime import timezone as dt_timezone
from io import StringIO
from zoneinfo import ZoneInfo

from django.core.management import CommandError, call_command
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User

from apps.appointments.models import Appointment

from . import services
from .models import Availability, ConciliateurProfile, Slot


def make_conciliateur(email="c@b.fr", verified=True, department="69"):
    u = User.objects.create_user(email, "pw", role=User.Role.CONCILIATEUR, first_name="Jean")
    return ConciliateurProfile.objects.create(user=u, city="Lyon", department=department, is_verified=verified)


def client_for(user):
    c = APIClient()
    c.force_authenticate(user)
    return c


class CreateConciliateurCommandTests(TestCase):
    def test_creates_verified_conciliateur_who_can_log_in(self):
        call_command("create_conciliateur", "c@b.fr", password="S3cure-pass-42", city="Lyon", department="69", stdout=StringIO())
        u = User.objects.get(email="c@b.fr")
        self.assertEqual(u.role, User.Role.CONCILIATEUR)
        self.assertTrue(u.conciliateur.is_verified)
        r = self.client.post("/api/v1/auth/login", {"email": "c@b.fr", "password": "S3cure-pass-42"}, content_type="application/json")
        self.assertEqual(r.status_code, 200)

    def test_unverified_flag_and_duplicate(self):
        call_command("create_conciliateur", "c@b.fr", password="x", city="Lyon", department="69", unverified=True, stdout=StringIO())
        self.assertFalse(User.objects.get(email="c@b.fr").conciliateur.is_verified)
        with self.assertRaises(CommandError):
            call_command("create_conciliateur", "c@b.fr", password="x", city="Lyon", department="69")
        with self.assertRaises(CommandError):  # bad département code: nothing is created
            call_command("create_conciliateur", "d@b.fr", password="x", city="Lyon", department="zz")
        self.assertFalse(User.objects.filter(email="d@b.fr").exists())

    def test_no_public_conciliateur_registration(self):
        r = self.client.post("/api/v1/auth/conciliateur/register", {"email": "c@b.fr", "password": "S3cure-pass-42", "city": "Lyon"}, content_type="application/json")
        self.assertEqual(r.status_code, 404)


class ListingTests(TestCase):
    def setUp(self):
        self.visible = make_conciliateur("v@b.fr")
        self.hidden = make_conciliateur("h@b.fr", verified=False)
        self.user = client_for(User.objects.create_user("u@b.fr", "pw"))

    def ids(self):
        return [c["id"] for c in self.user.get("/api/v1/conciliateurs").json()]

    def test_only_verified_listed(self):
        self.assertEqual(self.ids(), [self.visible.id])
        self.assertEqual(self.user.get(f"/api/v1/conciliateurs/{self.hidden.id}/slots").status_code, 404)

    @override_settings(AUTHORIZE_ALL=True)
    def test_authorize_all_lists_unverified(self):
        self.assertCountEqual(self.ids(), [self.visible.id, self.hidden.id])

    def test_anonymous_refused(self):
        self.assertEqual(APIClient().get("/api/v1/conciliateurs").status_code, 401)


class SearchTests(TestCase):
    def setUp(self):
        self.lyon = make_conciliateur("l@b.fr", department="69")
        self.corse = make_conciliateur("k@b.fr", department="2A")
        self.plaignant = User.objects.create_user("u@b.fr", "pw")
        self.user = client_for(self.plaignant)

    def in_days(self, d):
        return timezone.now() + timedelta(days=d)

    def ids(self, query):
        return [c["id"] for c in self.user.get(f"/api/v1/conciliateurs{query}").json()]

    def test_filter_by_department(self):
        self.assertEqual(self.ids("?department=69"), [self.lyon.id])
        self.assertEqual(self.ids("?department=2a"), [self.corse.id])
        self.assertEqual(self.ids("?department=13"), [])

    def test_filter_available_needs_a_free_slot(self):
        self.assertEqual(self.ids("?available=true"), [])
        slot = Slot.objects.create(conciliateur=self.lyon, start=self.in_days(3), end=self.in_days(3) + timedelta(hours=1))
        self.assertEqual(self.ids("?available=true"), [self.lyon.id])
        Appointment.objects.create(user=self.plaignant, slot=slot, first_name="A", last_name="B", phone="0612345678")
        self.assertEqual(self.ids("?available=true"), [])

    def test_slots_date_range(self):
        for d in (2, 5, 9):
            Slot.objects.create(conciliateur=self.lyon, start=self.in_days(d), end=self.in_days(d) + timedelta(hours=1))
        url = f"/api/v1/conciliateurs/{self.lyon.id}/slots"
        self.assertEqual(len(self.user.get(url).json()), 3)
        window = self.user.get(url, {"from": self.in_days(3).isoformat(), "to": self.in_days(7).date().isoformat()}).json()
        self.assertEqual(len(window), 1)
        self.assertEqual(self.user.get(url, {"from": "not-a-date"}).status_code, 400)


class SlotTests(TestCase):
    def setUp(self):
        self.c = make_conciliateur()
        self.api = client_for(self.c.user)
        start = timezone.now() + timedelta(days=3)
        self.body = {"start": start.isoformat(), "end": (start + timedelta(hours=1)).isoformat(), "location": "Mairie de Lyon 3e, salle 2"}

    def test_create_and_list_free_slots(self):
        self.assertEqual(self.api.post("/api/v1/me/slots", self.body, format="json").status_code, 201)
        user = client_for(User.objects.create_user("u@b.fr", "pw"))
        self.assertEqual(len(user.get(f"/api/v1/conciliateurs/{self.c.id}/slots").json()), 1)

    def test_location_is_required_and_exposed(self):
        self.assertEqual(self.api.post("/api/v1/me/slots", {k: v for k, v in self.body.items() if k != "location"}, format="json").status_code, 400)
        self.api.post("/api/v1/me/slots", self.body, format="json")
        user = client_for(User.objects.create_user("u@b.fr", "pw"))
        self.assertEqual(user.get(f"/api/v1/conciliateurs/{self.c.id}/slots").json()[0]["location"], self.body["location"])

    def test_invalid_slots(self):
        self.assertEqual(self.api.post("/api/v1/me/slots", {**self.body, "end": self.body["start"]}, format="json").status_code, 400)
        past = (timezone.now() - timedelta(days=1)).isoformat()
        self.assertEqual(self.api.post("/api/v1/me/slots", {"start": past, "end": self.body["start"]}, format="json").status_code, 400)

    def test_plain_user_and_unverified_cannot_manage_slots(self):
        self.assertEqual(client_for(User.objects.create_user("u@b.fr", "pw")).get("/api/v1/me/slots").status_code, 403)
        self.assertEqual(client_for(make_conciliateur("x@b.fr", verified=False).user).get("/api/v1/me/slots").status_code, 403)

    @override_settings(AUTHORIZE_ALL=True)
    def test_unverified_can_manage_slots_when_authorize_all(self):
        api = client_for(make_conciliateur("x@b.fr", verified=False).user)
        self.assertEqual(api.post("/api/v1/me/slots", self.body, format="json").status_code, 201)

    def test_delete_only_own_slot(self):
        slot = Slot.objects.create(conciliateur=self.c, start=timezone.now() + timedelta(days=1), end=timezone.now() + timedelta(days=2))
        other = client_for(make_conciliateur("o@b.fr").user)
        self.assertEqual(other.delete(f"/api/v1/me/slots/{slot.id}").status_code, 404)
        self.assertEqual(self.api.delete(f"/api/v1/me/slots/{slot.id}").status_code, 204)


class RunserverFlagTests(TestCase):
    base = "django.contrib.staticfiles.management.commands.runserver.Command.handle"

    def run_flag(self, **kw):
        from unittest import mock

        from django.core.management import call_command

        with override_settings(AUTHORIZE_ALL=False), mock.patch(self.base):
            call_command("runserver", **kw)
            from django.conf import settings

            return settings.AUTHORIZE_ALL

    def test_flag(self):
        self.assertTrue(self.run_flag(authorize_all="yes"))
        self.assertFalse(self.run_flag())


class AvailabilityTests(TestCase):
    rule = {"weekday": 0, "start_time": "09:00", "end_time": "11:00", "slot_minutes": 60, "location": "Mairie de Lyon 3e"}

    def setUp(self):
        self.c = make_conciliateur()
        self.api = client_for(self.c.user)
        self.plaignant = client_for(User.objects.create_user("u@b.fr", "pw"))

    def test_create_generates_slots_in_local_time(self):
        r = self.api.post("/api/v1/me/availabilities", self.rule, format="json")
        self.assertEqual(r.status_code, 201)
        slots = list(self.c.slots.all())
        self.assertTrue(14 <= len(slots) <= 18)  # 2 per Monday over 8 weeks
        paris = ZoneInfo("Europe/Paris")
        for s in slots:
            local = s.start.astimezone(paris)
            self.assertEqual((local.weekday(), local.minute), (0, 0))
            self.assertIn(local.hour, (9, 10))
            self.assertEqual((s.location, s.end - s.start), ("Mairie de Lyon 3e", timedelta(hours=1)))
            self.assertGreater(s.start, timezone.now())

    def test_dst_change_keeps_local_time(self):
        rule = Availability.objects.create(conciliateur=self.c, weekday=0, start_time=time(9), end_time=time(10), location="x", valid_from=date(2030, 3, 18), valid_until=date(2030, 4, 8))
        services.materialize(rule, now=datetime(2030, 3, 15, tzinfo=dt_timezone.utc))
        utc_hours = {s.start.date().isoformat(): s.start.hour for s in self.c.slots.all()}
        # Paris switches to summer time on 2030-03-31: 09:00 local = 08:00Z before, 07:00Z after.
        self.assertEqual(utc_hours, {"2030-03-18": 8, "2030-03-25": 8, "2030-04-01": 7, "2030-04-08": 7})

    def test_deleted_slot_is_not_regenerated_but_horizon_is_extended(self):
        rule = Availability.objects.create(conciliateur=self.c, weekday=0, start_time=time(9), end_time=time(10), location="x")
        now = datetime(2030, 1, 1, tzinfo=dt_timezone.utc)
        services.materialize(rule, now=now)
        first = self.c.slots.first()
        first.delete()
        before = self.c.slots.count()
        services.materialize(rule, now=now)
        self.assertEqual(self.c.slots.count(), before)  # nothing new, deleted one stays deleted
        services.materialize(rule, now=now + timedelta(weeks=4))
        self.assertGreater(self.c.slots.count(), before)

    def test_listing_slots_extends_stale_rules(self):
        Availability.objects.create(conciliateur=self.c, weekday=0, start_time=time(9), end_time=time(10), location="x")  # never generated
        r = self.plaignant.get(f"/api/v1/conciliateurs/{self.c.id}/slots")
        self.assertTrue(len(r.json()) >= 7)

    def test_delete_rule_keeps_booked_slots(self):
        rid = self.api.post("/api/v1/me/availabilities", self.rule, format="json").json()["id"]
        booked = self.c.slots.order_by("start").first()
        Appointment.objects.create(user=User.objects.get(email="u@b.fr"), slot=booked, first_name="A", last_name="B", phone="0612345678")
        self.assertEqual(self.api.delete(f"/api/v1/me/availabilities/{rid}").status_code, 204)
        self.assertEqual(list(self.c.slots.all()), [booked])
        booked.refresh_from_db()
        self.assertIsNone(booked.availability)

    def test_validation_and_permissions(self):
        for bad in ({"weekday": 7}, {"end_time": "08:00"}, {"slot_minutes": 5}, {"end_time": "09:30"}, {"location": ""}, {"valid_from": "2030-02-01", "valid_until": "2030-01-01"}):
            self.assertEqual(self.api.post("/api/v1/me/availabilities", {**self.rule, **bad}, format="json").status_code, 400, bad)
        self.assertEqual(self.plaignant.post("/api/v1/me/availabilities", self.rule, format="json").status_code, 403)
        other = client_for(make_conciliateur("o@b.fr").user)
        rid = self.api.post("/api/v1/me/availabilities", self.rule, format="json").json()["id"]
        self.assertEqual(other.delete(f"/api/v1/me/availabilities/{rid}").status_code, 404)
