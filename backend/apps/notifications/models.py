from django.conf import settings
from django.db import models


class Notification(models.Model):
    class Kind(models.TextChoices):
        APPOINTMENT_BOOKED = "APPOINTMENT_BOOKED"
        APPOINTMENT_UPDATED = "APPOINTMENT_UPDATED"
        APPOINTMENT_CANCELLED = "APPOINTMENT_CANCELLED"

    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    kind = models.CharField(max_length=30, choices=Kind)
    appointment = models.ForeignKey("appointments.Appointment", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    message = models.TextField()  # human-readable snapshot, in French
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-created_at", "-id")
        indexes = [models.Index(fields=("recipient", "read_at"))]
