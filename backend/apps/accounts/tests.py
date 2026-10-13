from django.test import TestCase

from .models import User


class UserModelTests(TestCase):
    def test_create_user_by_email(self):
        u = User.objects.create_user("a@b.fr", "pw12345678")
        self.assertEqual(u.role, User.Role.USER)
        self.assertTrue(u.check_password("pw12345678"))
        self.assertFalse(u.is_staff)

    def test_create_superuser(self):
        self.assertTrue(User.objects.create_superuser("s@b.fr", "pw12345678").is_superuser)


class AuthApiTests(TestCase):
    creds = {"email": "a@b.fr", "password": "S3cure-pass-42"}

    def register(self, **extra):
        return self.client.post("/api/v1/auth/register", {**self.creds, **extra}, content_type="application/json")

    def login(self):
        return self.client.post("/api/v1/auth/login", self.creds, content_type="application/json")

    def test_register_creates_plain_user_and_hides_password(self):
        r = self.register(role="CONCILIATEUR")  # role must not be client-controlled
        self.assertEqual(r.status_code, 201)
        self.assertNotIn("password", r.json())
        self.assertEqual(User.objects.get().role, User.Role.USER)

    def test_register_rejects_weak_password_and_duplicate(self):
        self.assertEqual(self.register(password="123").status_code, 400)
        self.register()
        self.assertEqual(self.register().status_code, 400)

    def test_login_me_refresh(self):
        self.register()
        tokens = self.login().json()
        auth = {"HTTP_AUTHORIZATION": f"Bearer {tokens['access']}"}
        me = self.client.get("/api/v1/me", **auth)
        self.assertEqual((me.status_code, me.json()["role"]), (200, "USER"))
        r = self.client.post("/api/v1/auth/refresh", {"refresh": tokens["refresh"]}, content_type="application/json")
        self.assertIn("access", r.json())

    def test_bad_login_and_anonymous_me(self):
        self.assertEqual(self.login().status_code, 401)
        self.assertEqual(self.client.get("/api/v1/me").status_code, 401)
