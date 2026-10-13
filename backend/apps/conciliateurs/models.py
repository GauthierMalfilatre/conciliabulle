from django.conf import settings
from django.db import models


class ConciliateurProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="conciliateur")
    city = models.CharField(max_length=100)
    bio = models.TextField(blank=True)
    # Real conciliateurs are appointed officially: an admin validates them.
    is_verified = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.email} ({self.city})"
