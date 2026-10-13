from unittest import mock

from django.db.utils import OperationalError
from django.test import SimpleTestCase, TestCase


class HealthTests(TestCase):
    def test_ok(self):
        r = self.client.get("/api/v1/health")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), {"status": "ok", "database": "ok"})


class HealthDbDownTests(SimpleTestCase):
    def test_db_down(self):
        with mock.patch("apps.health.views.connection.ensure_connection", side_effect=OperationalError):
            r = self.client.get("/api/v1/health")
        self.assertEqual(r.status_code, 503)
        self.assertEqual(r.json()["database"], "error")
