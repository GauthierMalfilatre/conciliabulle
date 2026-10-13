import os
import subprocess
import sys

from django.conf import settings
from django.test import SimpleTestCase, TestCase

FRONT = "http://localhost:3000"


class CorsTests(TestCase):
    def test_preflight_allowed_for_front(self):
        r = self.client.options(
            "/api/v1/appointments",
            headers={"Origin": FRONT, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "authorization,content-type"},
        )
        self.assertEqual(r.headers["Access-Control-Allow-Origin"], FRONT)
        self.assertIn("authorization", r.headers["Access-Control-Allow-Headers"])

    def test_other_origin_not_allowed(self):
        r = self.client.get("/api/v1/health", headers={"Origin": "http://evil.example"})
        self.assertNotIn("Access-Control-Allow-Origin", r.headers)


class SettingsTests(SimpleTestCase):
    """Settings are loaded in a subprocess with an explicit environment (and no inherited .env values)."""

    def load(self, **env):
        code = "import os, django; os.environ['DJANGO_SETTINGS_MODULE']='config.settings'; django.setup(); from django.conf import settings as s; print(s.DEBUG, s.SECRET_KEY, s.ALLOWED_HOSTS)"
        base = {"PATH": os.environ["PATH"], "DEBUG": "", "SECRET_KEY": "", "ALLOWED_HOSTS": ""}  # "" also blocks .env from filling them
        return subprocess.run([sys.executable, "-c", code], cwd=settings.BASE_DIR, env={**base, **env}, capture_output=True, text=True)

    def test_secret_key_is_required_unless_debug(self):
        r = self.load()
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("SECRET_KEY", r.stderr)
        self.assertEqual(self.load(DEBUG="true").returncode, 0)

    def test_debug_is_off_by_default_and_hosts_come_from_env(self):
        r = self.load(SECRET_KEY="s3cret", ALLOWED_HOSTS="api.example.org, localhost")
        self.assertEqual(r.stdout.strip(), "False s3cret ['api.example.org', 'localhost']")
