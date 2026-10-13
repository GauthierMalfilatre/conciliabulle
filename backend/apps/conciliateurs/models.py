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
    # Shown to the plaignant once the appointment is booked; empty = settings.DEFAULT_APPOINTMENT_INSTRUCTIONS.
    instructions = models.TextField(blank=True)
    # Real conciliateurs are appointed officially: an admin validates them.
    is_verified = models.BooleanField(default=False)
    # Secret in the URL of the .ics feed (calendar apps cannot send a JWT). Created on first use.
    calendar_token = models.CharField(max_length=64, unique=True, null=True, blank=True, editable=False)

    def __str__(self):
        return f"{self.user.email} ({self.city})"

    @property
    def appointment_instructions(self):
        return self.instructions or settings.DEFAULT_APPOINTMENT_INSTRUCTIONS


class Availability(models.Model):
    """Weekly recurring availability, e.g. every Tuesday 14:00-17:00 in 60-minute slots.

    Slots are generated from it (see services.materialize); times are local (settings.LOCAL_TIME_ZONE).
    """

    WEEKDAYS = [(0, "Lundi"), (1, "Mardi"), (2, "Mercredi"), (3, "Jeudi"), (4, "Vendredi"), (5, "Samedi"), (6, "Dimanche")]

    conciliateur = models.ForeignKey(ConciliateurProfile, on_delete=models.CASCADE, related_name="availabilities")
    weekday = models.PositiveSmallIntegerField(choices=WEEKDAYS)
    start_time = models.TimeField()
    end_time = models.TimeField()
    slot_minutes = models.PositiveSmallIntegerField(default=60)
    location = models.CharField(max_length=255)
    valid_from = models.DateField(null=True, blank=True)
    valid_until = models.DateField(null=True, blank=True)
    generated_until = models.DateField(null=True, blank=True, editable=False)  # slots exist up to this day


class SlotQuerySet(models.QuerySet):
    def free(self):
        return self.filter(start__gt=timezone.now()).exclude(appointments__status="BOOKED")


class Slot(models.Model):
    objects = SlotQuerySet.as_manager()

    conciliateur = models.ForeignKey(ConciliateurProfile, on_delete=models.CASCADE, related_name="slots")
    start = models.DateTimeField()
    end = models.DateTimeField()
    location = models.CharField(max_length=255, help_text="Where the appointment takes place (address, room...).")
    # Set when generated from a recurring availability.
    availability = models.ForeignKey(Availability, null=True, blank=True, on_delete=models.SET_NULL, related_name="slots")

    class Meta:
        ordering = ("start",)
        constraints = [
            models.UniqueConstraint(fields=("conciliateur", "start"), name="unique_slot_start"),
            models.CheckConstraint(condition=models.Q(end__gt=models.F("start")), name="slot_end_after_start"),
        ]
