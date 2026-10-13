from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from django.conf import settings
from django.db.models import Q
from django.utils import timezone

from .models import Availability, Slot


def _horizon(now):
    tz = ZoneInfo(settings.LOCAL_TIME_ZONE)
    return now.astimezone(tz).date() + timedelta(weeks=settings.AVAILABILITY_HORIZON_WEEKS)


def materialize(rule, now=None):
    """Create the slots of a recurring availability up to the horizon.

    Only days after rule.generated_until are generated, so a slot the conciliateur deleted is not re-created.
    """
    now = now or timezone.now()
    tz = ZoneInfo(settings.LOCAL_TIME_ZONE)
    today = now.astimezone(tz).date()
    horizon = _horizon(now)
    first = max(rule.valid_from or today, today)
    if rule.generated_until:
        first = max(first, rule.generated_until + timedelta(days=1))
    last = min(rule.valid_until or horizon, horizon)
    if first > last:
        return
    step = timedelta(minutes=rule.slot_minutes)
    slots = []
    for offset in range((last - first).days + 1):
        day = first + timedelta(days=offset)
        if day.weekday() != rule.weekday:
            continue
        start, end = datetime.combine(day, rule.start_time, tz), datetime.combine(day, rule.end_time, tz)
        while start + step <= end:
            if start > now:
                slots.append(Slot(conciliateur_id=rule.conciliateur_id, availability=rule, start=start, end=start + step, location=rule.location))
            start += step
    # ignore_conflicts: a slot already published at the same start (unique per conciliateur) wins.
    # ponytail: overlapping rules/slots of different lengths are not detected; add a check if conciliateurs hit it.
    Slot.objects.bulk_create(slots, ignore_conflicts=True)
    rule.generated_until = last
    rule.save(update_fields=["generated_until"])


def extend_rules(now=None):
    """Keep every rule generated up to the horizon (called lazily when slots are looked up: no cron needed)."""
    now = now or timezone.now()
    stale = Availability.objects.filter(Q(generated_until__isnull=True) | Q(generated_until__lt=_horizon(now)))
    for rule in stale:
        materialize(rule, now)
