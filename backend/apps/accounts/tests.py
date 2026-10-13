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
