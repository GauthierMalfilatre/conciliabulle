from apps.accounts.models import User
from apps.appointments.tests import AppointmentTestCase, make_slot
from apps.conciliateurs.tests import client_for, make_conciliateur

from .models import Notification

Kind = Notification.Kind


class AlertTests(AppointmentTestCase):
    def mine(self, kind=None):
        qs = Notification.objects.filter(recipient=self.c.user)
        return qs.filter(kind=kind) if kind else qs

    def test_booking_alerts_the_conciliateur_only(self):
        appt = self.book().json()
        n = self.mine().get()
        self.assertEqual((n.kind, n.appointment_id), (Kind.APPOINTMENT_BOOKED, appt["id"]))
        self.assertIn("Alice Durand", n.message)
        self.assertFalse(Notification.objects.filter(recipient=self.user).exists())

    def test_update_and_cancel_alert(self):
        appt_id = self.book().json()["id"]
        new = make_slot(self.c, days=5)
        self.api.patch(f"/api/v1/appointments/{appt_id}", {"slot_id": new.id}, format="json")
        updated = self.mine(Kind.APPOINTMENT_UPDATED).get()
        self.assertIn("Il était prévu le", updated.message)
        self.api.patch(f"/api/v1/appointments/{appt_id}", {"phone": "0612345678"}, format="json")
        self.assertNotIn("Il était prévu", self.mine(Kind.APPOINTMENT_UPDATED).first().message)  # slot unchanged
        self.api.delete(f"/api/v1/appointments/{appt_id}")
        self.assertEqual(self.mine(Kind.APPOINTMENT_CANCELLED).count(), 1)

    def test_moving_to_another_conciliateur_alerts_both(self):
        other = make_conciliateur("o@b.fr")
        appt_id = self.book().json()["id"]
        self.api.patch(f"/api/v1/appointments/{appt_id}", {"slot_id": make_slot(other, days=5).id}, format="json")
        self.assertEqual(self.mine(Kind.APPOINTMENT_CANCELLED).count(), 1)
        self.assertEqual(Notification.objects.filter(recipient=other.user, kind=Kind.APPOINTMENT_BOOKED).count(), 1)

    def test_failed_booking_sends_nothing(self):
        self.book()
        self.book(api=client_for(User.objects.create_user("o@b.fr", "pw")))  # 409
        self.assertEqual(self.mine().count(), 1)


class NotificationApiTests(AppointmentTestCase):
    def setUp(self):
        super().setUp()
        self.book()
        self.book(make_slot(self.c, days=6))
        self.me = client_for(self.c.user)

    def test_list_unread_and_mark_read(self):
        items = self.me.get("/api/v1/me/notifications").json()
        self.assertEqual(len(items), 2)
        self.assertEqual(self.me.post(f"/api/v1/me/notifications/{items[0]['id']}/read").status_code, 200)
        unread = self.me.get("/api/v1/me/notifications", {"unread": "true"}).json()
        self.assertEqual([n["id"] for n in unread], [items[1]["id"]])
        self.assertEqual(self.me.post("/api/v1/me/notifications/read-all").json(), {"updated": 1})
        self.assertEqual(self.me.get("/api/v1/me/notifications", {"unread": "true"}).json(), [])

    def test_only_own_notifications(self):
        stranger = client_for(make_conciliateur("o@b.fr").user)
        self.assertEqual(stranger.get("/api/v1/me/notifications").json(), [])
        nid = Notification.objects.first().id
        self.assertEqual(stranger.post(f"/api/v1/me/notifications/{nid}/read").status_code, 404)
        self.assertEqual(self.client.get("/api/v1/me/notifications").status_code, 401)


class EmailAlertTests(AppointmentTestCase):
    def test_booking_emails_the_conciliateur_after_commit(self):
        from django.core import mail

        with self.captureOnCommitCallbacks(execute=True):
            self.book()
        self.assertEqual(len(mail.outbox), 1)
        m = mail.outbox[0]
        self.assertEqual((m.to, m.subject), ([self.c.user.email], "Nouveau rendez-vous"))
        self.assertIn("Téléphone : +33 6 12 34 56 78", m.body)
        self.assertEqual(self.api.get("/api/v1/appointments").status_code, 200)

    def test_cancel_email_has_no_phone(self):
        from django.core import mail

        appt_id = self.book().json()["id"]
        with self.captureOnCommitCallbacks(execute=True):
            self.api.delete(f"/api/v1/appointments/{appt_id}")
        self.assertNotIn("Téléphone", mail.outbox[-1].body)
        self.assertEqual(mail.outbox[-1].subject, "Rendez-vous annulé")

    def test_mail_failure_does_not_break_the_booking(self):
        from unittest import mock

        with mock.patch("apps.notifications.services.send_mail", side_effect=OSError("smtp down")):
            with self.assertLogs("apps.notifications.services", level="ERROR"):
                with self.captureOnCommitCallbacks(execute=True):
                    r = self.book()
        self.assertEqual(r.status_code, 201)
