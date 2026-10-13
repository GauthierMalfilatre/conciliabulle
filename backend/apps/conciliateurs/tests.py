from datetime import timedelta

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User

from .models import ConciliateurProfile, Slot


def make_conciliateur(email="c@b.fr", verified=True):
    u = User.objects.create_user(email, "pw", role=User.Role.CONCILIATEUR, first_name="Jean")
    return ConciliateurProfile.objects.create(user=u, city="Lyon", is_verified=verified)


def client_for(user):
    c = APIClient()
    c.force_authenticate(user)
    return c


class ConciliateurRegisterTests(TestCase):
    def test_register_creates_unverified_conciliateur(self):
        r = self.client.post(
            "/api/v1/auth/conciliateur/register",
            {"email": "c@b.fr", "password": "S3cure-pass-42", "city": "Lyon"},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 201)
        u = User.objects.get(email="c@b.fr")
        self.assertEqual(u.role, User.Role.CONCILIATEUR)
        self.assertFalse(u.conciliateur.is_verified)

    def test_city_required(self):
        r = self.client.post(
            "/api/v1/auth/conciliateur/register",
            {"email": "c@b.fr", "password": "S3cure-pass-42"},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 400)
        self.assertFalse(User.objects.exists())


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


class SlotTests(TestCase):
    def setUp(self):
        self.c = make_conciliateur()
        self.api = client_for(self.c.user)
        start = timezone.now() + timedelta(days=3)
        self.body = {"start": start.isoformat(), "end": (start + timedelta(hours=1)).isoformat()}

    def test_create_and_list_free_slots(self):
        self.assertEqual(self.api.post("/api/v1/me/slots", self.body, format="json").status_code, 201)
        user = client_for(User.objects.create_user("u@b.fr", "pw"))
        self.assertEqual(len(user.get(f"/api/v1/conciliateurs/{self.c.id}/slots").json()), 1)

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
