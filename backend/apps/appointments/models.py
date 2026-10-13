from django.conf import settings
from django.db import models


class Appointment(models.Model):
    class Status(models.TextChoices):
        BOOKED = "BOOKED"
        CANCELLED = "CANCELLED"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="appointments")
    slot = models.ForeignKey("conciliateurs.Slot", on_delete=models.PROTECT, related_name="appointments")
    status = models.CharField(max_length=10, choices=Status, default=Status.BOOKED)
    motive = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("slot__start",)
        constraints = [
            # DB-level guard against double booking, even under concurrent requests.
            models.UniqueConstraint(fields=("slot",), condition=models.Q(status="BOOKED"), name="one_booking_per_slot"),
        ]
