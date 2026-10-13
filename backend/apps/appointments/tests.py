from datetime import UTC, timedelta

from django.test import SimpleTestCase, TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.conciliateurs.models import Slot
from apps.conciliateurs.tests import client_for, make_conciliateur

from .models import Appointment


def make_slot(conciliateur, days=3, hours=0):
    start = timezone.now() + timedelta(days=days, hours=hours)
    return Slot.objects.create(conciliateur=conciliateur, start=start, end=start + timedelta(hours=1))


CONTACT = {"first_name": "Alice", "last_name": "Durand", "phone": "+33 6 12 34 56 78"}


class AppointmentTestCase(TestCase):
    def setUp(self):
        self.c = make_conciliateur()
        self.slot = make_slot(self.c)
        self.user = User.objects.create_user("u@b.fr", "pw")
        self.api = client_for(self.user)

    def book(self, slot=None, api=None):
        return (api or self.api).post("/api/v1/appointments", {"slot_id": (slot or self.slot).id, "motive": "voisinage", **CONTACT}, format="json")


class BookTests(AppointmentTestCase):
    def test_book_then_slot_disappears_from_free_slots(self):
        r = self.book()
        self.assertEqual((r.status_code, r.json()["status"]), (201, "BOOKED"))
        self.assertEqual(self.api.get(f"/api/v1/conciliateurs/{self.c.id}/slots").json(), [])
        self.assertEqual(len(self.api.get("/api/v1/appointments").json()), 1)
        self.assertEqual(len(client_for(self.c.user).get("/api/v1/me/appointments").json()), 1)

    def test_contact_details_are_mandatory_and_validated(self):
        for field in CONTACT:
            body = {"slot_id": self.slot.id, **{k: v for k, v in CONTACT.items() if k != field}}
            self.assertEqual(self.api.post("/api/v1/appointments", body, format="json").status_code, 400, field)
        bad = {"slot_id": self.slot.id, **CONTACT, "phone": "abc"}
        self.assertEqual(self.api.post("/api/v1/appointments", bad, format="json").status_code, 400)
        self.assertFalse(Appointment.objects.exists())

    def test_conciliateur_sees_plaignant_contact(self):
        self.book()
        appt = client_for(self.c.user).get("/api/v1/me/appointments").json()[0]
        self.assertEqual({k: appt[k] for k in CONTACT}, CONTACT)

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


class CancelTests(AppointmentTestCase):
    def test_cancel_frees_slot_and_keeps_row(self):
        appt_id = self.book().json()["id"]
        self.assertEqual(self.api.delete(f"/api/v1/appointments/{appt_id}").status_code, 204)
        self.assertEqual(Appointment.objects.get(pk=appt_id).status, Appointment.Status.CANCELLED)
        self.assertEqual(len(self.api.get(f"/api/v1/conciliateurs/{self.c.id}/slots").json()), 1)
        self.assertEqual(self.book(api=client_for(User.objects.create_user("o@b.fr", "pw"))).status_code, 201)

    def test_cancel_twice_refused(self):
        appt_id = self.book().json()["id"]
        self.api.delete(f"/api/v1/appointments/{appt_id}")
        self.assertEqual(self.api.delete(f"/api/v1/appointments/{appt_id}").status_code, 400)

    def test_cancel_inside_window_refused(self):
        appt_id = self.book(make_slot(self.c, days=0, hours=2)).json()["id"]
        self.assertEqual(self.api.delete(f"/api/v1/appointments/{appt_id}").status_code, 400)

    def test_cannot_cancel_someone_elses(self):
        appt_id = self.book().json()["id"]
        other = client_for(User.objects.create_user("o@b.fr", "pw"))
        self.assertEqual(other.delete(f"/api/v1/appointments/{appt_id}").status_code, 404)


class RescheduleTests(AppointmentTestCase):
    def patch(self, appt_id, slot, api=None):
        return (api or self.api).patch(f"/api/v1/appointments/{appt_id}", {"slot_id": slot.id}, format="json")

    def test_reschedule_swaps_slots(self):
        appt_id = self.book().json()["id"]
        new = make_slot(self.c, days=5)
        r = self.patch(appt_id, new)
        self.assertEqual((r.status_code, r.json()["slot"]["id"]), (200, new.id))
        free = [s["id"] for s in self.api.get(f"/api/v1/conciliateurs/{self.c.id}/slots").json()]
        self.assertEqual(free, [self.slot.id])

    def test_reschedule_to_taken_slot_is_409_and_unchanged(self):
        appt_id = self.book().json()["id"]
        taken = make_slot(self.c, days=5)
        self.book(taken, api=client_for(User.objects.create_user("o@b.fr", "pw")))
        self.assertEqual(self.patch(appt_id, taken).status_code, 409)
        self.assertEqual(Appointment.objects.get(pk=appt_id).slot_id, self.slot.id)

    def test_reschedule_refused_in_window_cancelled_same_slot_or_missing_slot(self):
        soon = make_slot(self.c, days=0, hours=2)
        soon_id = self.book(soon).json()["id"]
        self.assertEqual(self.patch(soon_id, make_slot(self.c, days=6)).status_code, 400)
        appt_id = self.book().json()["id"]
        self.assertEqual(self.patch(appt_id, self.slot).status_code, 400)
        self.assertEqual(self.api.patch(f"/api/v1/appointments/{appt_id}", {}, format="json").status_code, 400)  # nothing to change
        self.api.delete(f"/api/v1/appointments/{appt_id}")
        self.assertEqual(self.patch(appt_id, make_slot(self.c, days=7)).status_code, 400)

    def test_cannot_reschedule_someone_elses(self):
        appt_id = self.book().json()["id"]
        other = client_for(User.objects.create_user("o@b.fr", "pw"))
        self.assertEqual(self.patch(appt_id, make_slot(self.c, days=5), api=other).status_code, 404)


class UpdateDetailsTests(AppointmentTestCase):
    def test_patch_contact_without_changing_slot(self):
        appt_id = self.book().json()["id"]
        r = self.api.patch(f"/api/v1/appointments/{appt_id}", {"phone": "0612345678", "motive": "autre"}, format="json")
        self.assertEqual((r.status_code, r.json()["phone"], r.json()["slot"]["id"]), (200, "0612345678", self.slot.id))

    def test_patch_details_refused_inside_window(self):
        appt_id = self.book(make_slot(self.c, days=0, hours=2)).json()["id"]
        self.assertEqual(self.api.patch(f"/api/v1/appointments/{appt_id}", {"phone": "0612345678"}, format="json").status_code, 400)


class CalendarExportTests(AppointmentTestCase):
    def feed_url(self, api=None):
        url = (api or client_for(self.c.user)).get("/api/v1/me/calendar").json()["url"]
        return url.split("testserver")[1]

    def test_feed_contains_booked_appointments_only(self):
        self.book()
        cancelled = self.book(make_slot(self.c, days=5)).json()["id"]
        self.api.delete(f"/api/v1/appointments/{cancelled}")
        other = make_conciliateur("o@b.fr")
        self.book(make_slot(other, days=4))
        r = APIClient().get(self.feed_url())  # no credentials: the token is the credential
        text = r.content.decode()
        self.assertEqual((r.status_code, r["Content-Type"]), (200, "text/calendar; charset=utf-8"))
        self.assertEqual(text.count("BEGIN:VEVENT"), 1)
        self.assertTrue(text.startswith("BEGIN:VCALENDAR\r\n") and text.endswith("END:VCALENDAR\r\n"))
        self.assertIn("SUMMARY:Rendez-vous : Alice Durand", text)
        self.assertIn("PRODID:-//ConciliaBulle//", text)
        self.assertIn("X-WR-CALNAME:ConciliaBulle : rendez-vous", text)
        self.assertIn("Téléphone : +33 6 12 34 56 78", text.replace("\\", "").replace("\r\n ", ""))

    def test_dates_are_utc(self):
        self.book()
        text = APIClient().get(self.feed_url()).content.decode()
        self.assertIn("DTSTART:" + self.slot.start.astimezone(UTC).strftime("%Y%m%dT%H%M%SZ"), text)

    def test_rotate_invalidates_old_link(self):
        api = client_for(self.c.user)
        old = self.feed_url(api)
        self.assertEqual(self.feed_url(api), old)  # stable until rotated
        new = api.post("/api/v1/me/calendar").json()["url"].split("testserver")[1]
        self.assertNotEqual(new, old)
        self.assertEqual(APIClient().get(old).status_code, 404)
        self.assertEqual(APIClient().get(new).status_code, 200)

    def test_only_conciliateurs_get_a_link_and_unknown_token_is_404(self):
        self.assertEqual(self.api.get("/api/v1/me/calendar").status_code, 403)
        self.assertEqual(APIClient().get("/api/v1/calendar/nope.ics").status_code, 404)


class IcsFormatTests(SimpleTestCase):
    def test_escaping_and_folding(self):
        from . import ics

        self.assertEqual(ics._escape("a,b;c\nd\\"), "a\\,b\;c\\nd\\\\")
        folded = ics._fold("X:" + "é" * 100)
        for line in folded.split("\r\n"):
            self.assertLessEqual(len(line.encode()), 75)
        self.assertEqual(folded.replace("\r\n ", ""), "X:" + "é" * 100)  # lossless, no split character


class InstructionsTests(AppointmentTestCase):
    def test_default_then_custom_instructions(self):
        from django.conf import settings

        self.assertEqual(self.book().json()["instructions"], settings.DEFAULT_APPOINTMENT_INSTRUCTIONS)
        r = client_for(self.c.user).patch("/api/v1/me/profile", {"instructions": "Apportez votre pièce d'identité."}, format="json")
        self.assertEqual(r.status_code, 200)
        listing = self.api.get("/api/v1/appointments").json()
        self.assertEqual(listing[0]["instructions"], "Apportez votre pièce d'identité.")
