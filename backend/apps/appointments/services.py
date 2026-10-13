from datetime import timedelta

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import APIException, ValidationError

from apps.conciliateurs.models import ConciliateurProfile

from .models import Appointment


class SlotTaken(APIException):
    status_code = 409
    default_detail = "This slot is already booked."


def check_bookable(slot):
    if not ConciliateurProfile.objects.visible().filter(pk=slot.conciliateur_id).exists():
        raise ValidationError({"slot_id": "Unknown slot."})
    if slot.start <= timezone.now():
        raise ValidationError({"slot_id": "This slot is in the past."})
    if slot.appointments.filter(status=Appointment.Status.BOOKED).exists():
        raise SlotTaken


def book(user, slot, motive=""):
    check_bookable(slot)
    try:
        with transaction.atomic():
            return Appointment.objects.create(user=user, slot=slot, motive=motive)
    except IntegrityError:
        raise SlotTaken


def check_changeable(appointment):
    if appointment.status != Appointment.Status.BOOKED:
        raise ValidationError("Appointment is already cancelled.")
    limit = timezone.now() + timedelta(hours=settings.CANCELLATION_WINDOW_HOURS)
    if appointment.slot.start < limit:
        raise ValidationError(f"Too late: changes are closed {settings.CANCELLATION_WINDOW_HOURS}h before the appointment.")


def cancel(appointment):
    check_changeable(appointment)
    appointment.status = Appointment.Status.CANCELLED
    appointment.save(update_fields=["status"])
