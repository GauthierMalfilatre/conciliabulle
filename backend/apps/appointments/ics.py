"""Minimal RFC 5545 (iCalendar) writer: enough for a read-only appointments feed."""
from datetime import UTC


def _escape(text):
    return text.replace("\\", "\\\\").replace(";", "\;").replace(",", "\\,").replace("\r\n", "\n").replace("\n", "\\n")


def _fold(line):
    """Lines are limited to 75 octets; continuation lines start with a space. Never split a UTF-8 character."""
    out, current, size, limit = [], "", 0, 75
    for ch in line:
        n = len(ch.encode())
        if size + n > limit:
            out.append(current)
            current, size, limit = " ", 1, 75
        current += ch
        size += n
    out.append(current)
    return "\r\n".join(out)


def _utc(dt):
    return dt.astimezone(UTC).strftime("%Y%m%dT%H%M%SZ")


def build_calendar(appointments, name):
    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//justice-tech//conciliateurs//FR", "CALSCALE:GREGORIAN", f"X-WR-CALNAME:{_escape(name)}"]
    for a in appointments:
        description = f"Téléphone : {a.phone}"
        if a.motive:
            description += f"\nMotif : {a.motive}"
        lines += [
            "BEGIN:VEVENT",
            f"UID:appointment-{a.pk}@justice-tech",
            f"DTSTAMP:{_utc(a.created_at)}",
            f"DTSTART:{_utc(a.slot.start)}",
            f"DTEND:{_utc(a.slot.end)}",
            f"SUMMARY:{_escape(f'Rendez-vous : {a.first_name} {a.last_name}')}",
            f"LOCATION:{_escape(a.slot.location)}",
            f"DESCRIPTION:{_escape(description)}",
            "END:VEVENT",
        ]
    lines.append("END:VCALENDAR")
    return "\r\n".join(_fold(line) for line in lines) + "\r\n"
