from django.core.cache import cache
from django.test import TestCase

from .models import Candidature

BODY = {
    "first_name": "Marie", "last_name": "Curie", "email": "m@example.fr", "phone": "06 12 34 56 78",
    "department": "69", "message": "Retraitée, disponible.", "consent": True,
}


class CandidatureTests(TestCase):
    def setUp(self):
        cache.clear()  # throttle counters live in the cache

    def post(self, **over):
        return self.client.post("/api/v1/candidatures", {**BODY, **over}, content_type="application/json")

    def test_public_submission_is_stored(self):
        r = self.post()
        self.assertEqual(r.status_code, 201)
        self.assertNotIn("consent", r.json())
        c = Candidature.objects.get()
        self.assertEqual((c.department, c.handled), ("69", False))

    def test_validation(self):
        self.assertEqual(self.post(consent=False).status_code, 400)
        self.assertEqual(self.post(department="zz").status_code, 400)
        self.assertEqual(self.post(phone="abc").status_code, 400)
        self.assertEqual(self.post(email="nope").status_code, 400)
        self.assertFalse(Candidature.objects.exists())

    def test_throttled_after_five_submissions(self):
        codes = [self.post().status_code for _ in range(6)]
        self.assertEqual(codes, [201] * 5 + [429])
