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


class DocsTests(TestCase):
    def test_swagger_and_schema(self):
        self.assertEqual(self.client.get("/api/docs/").status_code, 200)
        self.assertIn("/api/v1/health", self.client.get("/api/schema/?format=json").json()["paths"])
