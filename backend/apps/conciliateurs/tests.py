from django.test import TestCase

from apps.accounts.models import User


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
