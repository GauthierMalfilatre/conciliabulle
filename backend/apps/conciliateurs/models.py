from django.conf import settings
from django.db import models
from django.utils import timezone

from config.validators import department_validator


class ConciliateurQuerySet(models.QuerySet):
    def visible(self):
        # AUTHORIZE_ALL is a testing flag (see the runserver command).
        return self if settings.AUTHORIZE_ALL else self.filter(is_verified=True)


class ConciliateurProfile(models.Model):
    objects = ConciliateurQuerySet.as_manager()

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="conciliateur")
    city = models.CharField(max_length=100)
    department = models.CharField(max_length=3, db_index=True, validators=[department_validator])
    bio = models.TextField(blank=True)
    # Real conciliateurs are appointed officially: an admin validates them.
    is_verified = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.email} ({self.city})"


class SlotQuerySet(models.QuerySet):
    def free(self):
        return self.filter(start__gt=timezone.now()).exclude(appointments__status="BOOKED")


class Slot(models.Model):
    objects = SlotQuerySet.as_manager()

    conciliateur = models.ForeignKey(ConciliateurProfile, on_delete=models.CASCADE, related_name="slots")
    start = models.DateTimeField()
    end = models.DateTimeField()
    location = models.CharField(max_length=255, help_text="Where the appointment takes place (address, room...).")

    class Meta:
        ordering = ("start",)
        constraints = [
            models.UniqueConstraint(fields=("conciliateur", "start"), name="unique_slot_start"),
            models.CheckConstraint(condition=models.Q(end__gt=models.F("start")), name="slot_end_after_start"),
        ]
