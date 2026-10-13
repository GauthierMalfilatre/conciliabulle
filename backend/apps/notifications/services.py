from zoneinfo import ZoneInfo

from django.conf import settings

from .models import Notification

Kind = Notification.Kind


def _when(dt):
    return dt.astimezone(ZoneInfo(settings.LOCAL_TIME_ZONE)).strftime("%d/%m/%Y à %Hh%M")


def notify_conciliateur(kind, appointment, slot=None, old_start=None):
    """Alert the conciliateur that owns `slot` (default: the appointment's slot) about an appointment event."""
    slot = slot or appointment.slot
    who = f"{appointment.first_name} {appointment.last_name}"
    if kind == Kind.APPOINTMENT_BOOKED:
        message = f"Nouveau rendez-vous : {who} le {_when(slot.start)} ({slot.location})."
    elif kind == Kind.APPOINTMENT_UPDATED:
        message = f"Rendez-vous modifié : {who}, le {_when(slot.start)} ({slot.location})."
        if old_start:
            message += f" Il était prévu le {_when(old_start)}."
    else:
        message = f"Rendez-vous annulé : {who}, qui était prévu le {_when(slot.start)}."
    return Notification.objects.create(recipient=slot.conciliateur.user, kind=kind, appointment=appointment, message=message)
