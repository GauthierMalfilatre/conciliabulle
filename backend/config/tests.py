from django.test import TestCase

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
