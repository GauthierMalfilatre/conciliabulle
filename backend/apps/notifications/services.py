import logging
from zoneinfo import ZoneInfo

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction

from .models import Notification

Kind = Notification.Kind
logger = logging.getLogger(__name__)

SUBJECTS = {
    Kind.APPOINTMENT_BOOKED: "Nouveau rendez-vous",
    Kind.APPOINTMENT_UPDATED: "Rendez-vous modifié",
    Kind.APPOINTMENT_CANCELLED: "Rendez-vous annulé",
}


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
    recipient = slot.conciliateur.user
    notification = Notification.objects.create(recipient=recipient, kind=kind, appointment=appointment, message=message)
    body = message
    if kind != Kind.APPOINTMENT_CANCELLED:
        body += f"\nTéléphone : {appointment.phone}"
        if appointment.motive:
            body += f"\nMotif : {appointment.motive}"
    # After commit, so nobody is e-mailed about something that was rolled back.
    transaction.on_commit(lambda: _send_email(recipient.email, SUBJECTS[kind], body))
    return notification


def _send_email(to, subject, body):
    # ponytail: sent synchronously; a failure is logged and never breaks the booking. Use a task queue if SMTP is slow.
    try:
        send_mail(subject, body, None, [to])
    except Exception:
        logger.exception("Could not send the alert e-mail to %s", to)
