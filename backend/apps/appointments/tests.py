from datetime import timedelta

from django.test import TestCase, override_settings
from django.utils import timezone

from apps.accounts.models import User
from apps.conciliateurs.models import Slot
from apps.conciliateurs.tests import client_for, make_conciliateur

from .models import Appointment


def make_slot(conciliateur, days=3):
    start = timezone.now() + timedelta(days=days)
    return Slot.objects.create(conciliateur=conciliateur, start=start, end=start + timedelta(hours=1))


class AppointmentTestCase(TestCase):
    def setUp(self):
        self.c = make_conciliateur()
        self.slot = make_slot(self.c)
        self.user = User.objects.create_user("u@b.fr", "pw")
        self.api = client_for(self.user)

    def book(self, slot=None, api=None):
        return (api or self.api).post("/api/v1/appointments", {"slot_id": (slot or self.slot).id, "motive": "voisinage"}, format="json")


class BookTests(AppointmentTestCase):
    def test_book_then_slot_disappears_from_free_slots(self):
        r = self.book()
        self.assertEqual((r.status_code, r.json()["status"]), (201, "BOOKED"))
        self.assertEqual(self.api.get(f"/api/v1/conciliateurs/{self.c.id}/slots").json(), [])
        self.assertEqual(len(self.api.get("/api/v1/appointments").json()), 1)
        self.assertEqual(len(client_for(self.c.user).get("/api/v1/me/appointments").json()), 1)

    def test_double_booking_is_409(self):
        self.book()
        self.assertEqual(self.book(api=client_for(User.objects.create_user("o@b.fr", "pw"))).status_code, 409)

    def test_conciliateur_cannot_book(self):
        self.assertEqual(self.book(api=client_for(self.c.user)).status_code, 403)

    def test_past_and_unverified_slots_refused(self):
        past = Slot.objects.create(conciliateur=self.c, start=timezone.now() - timedelta(days=2), end=timezone.now() - timedelta(days=1))
        self.assertEqual(self.book(past).status_code, 400)
        hidden = make_slot(make_conciliateur("h@b.fr", verified=False))
        self.assertEqual(self.book(hidden).status_code, 400)
        with override_settings(AUTHORIZE_ALL=True):
            self.assertEqual(self.book(hidden).status_code, 201)

    def test_users_only_see_their_own_appointments(self):
        self.book()
        other = client_for(User.objects.create_user("o@b.fr", "pw"))
        self.assertEqual(other.get("/api/v1/appointments").json(), [])

    def test_booked_slot_cannot_be_deleted_by_conciliateur(self):
        self.book()
        self.assertEqual(client_for(self.c.user).delete(f"/api/v1/me/slots/{self.slot.id}").status_code, 409)
        self.assertTrue(Slot.objects.filter(pk=self.slot.pk).exists())
