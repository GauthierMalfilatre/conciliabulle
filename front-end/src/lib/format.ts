const TZ = "Europe/Paris";

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "mardi 24 octobre" */
export function formatDay(iso: string, { capital = false } = {}) {
  const s = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: TZ,
  }).format(new Date(iso));
  return capital ? capitalize(s) : s;
}

/** "14 h 30", "9 h" */
export function formatTime(iso: string) {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: TZ,
  }).formatToParts(new Date(iso));
  const h = parts.find((p) => p.type === "hour")!.value;
  const m = parts.find((p) => p.type === "minute")!.value;
  return m === "00" ? `${Number(h)} h` : `${Number(h)} h ${m}`;
}

/** "mardi 24 octobre à 14 h 30" */
export function formatDateTime(iso: string, opts?: { capital?: boolean }) {
  return `${formatDay(iso, opts)} à ${formatTime(iso)}`;
}

/** Short parts for a date block: { day: "24", month: "oct." } */
export function dateBlock(iso: string) {
  const d = new Date(iso);
  return {
    day: new Intl.DateTimeFormat("fr-FR", { day: "numeric", timeZone: TZ }).format(d),
    month: new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: TZ }).format(d),
  };
}

/** "2026-10-24", for grouping slots by day */
export function dayKey(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));
}

/** "14:30", for <input type="time"> */
export function timeValue(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(iso));
}

/** "le 12 octobre" style short date: "12 octobre" */
export function formatShortDate(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: TZ }).format(new Date(iso));
}
