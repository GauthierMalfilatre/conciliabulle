import type { Parametres, Plage, Weekday } from "./types";

// Pure helpers turning a conciliateur's settings into concrete slots.

export function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Local "YYYY-MM-DD" of a date. */
export function ymd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** Start times ("HHMM") fitting entirely within a half-day. */
function startsIn(plage: Plage, duree: number) {
  if (!plage.actif) return [];
  const out: string[] = [];
  for (let t = toMinutes(plage.debut); t + duree <= toMinutes(plage.fin); t += duree) {
    out.push(`${pad(Math.floor(t / 60))}${pad(t % 60)}`);
  }
  return out;
}

export function isAbsent(params: Parametres, day: Date) {
  const key = ymd(day);
  return params.absences.some((a) => a.du <= key && key <= a.au);
}

/** Office-hour start times of a given day ("HHMM"), ignoring bookings. */
export function dayStarts(params: Parametres, day: Date) {
  const wd = day.getDay();
  if (wd === 0 || isAbsent(params, day)) return [];
  const h = params.horaires[wd as Weekday];
  return [...startsIn(h.matin, params.dureeMinutes), ...startsIn(h.apresMidi, params.dureeMinutes)];
}

/** Slot ids encode conciliateur, day and time: `m1.2026-10-24.1430`. */
export function slotId(conciliateurId: string, day: Date, hhmm: string) {
  return `${conciliateurId}.${ymd(day)}.${hhmm}`;
}

export function parseSlotId(id: string) {
  const [conciliateurId, d, t] = id.split(".");
  if (!conciliateurId || !/^\d{4}-\d{2}-\d{2}$/.test(d ?? "") || !/^\d{4}$/.test(t ?? "")) return null;
  const [y, mo, da] = d.split("-").map(Number);
  const debut = new Date(y, mo - 1, da, Number(t.slice(0, 2)), Number(t.slice(2)));
  return { conciliateurId, day: startOfDay(debut), hhmm: t, debut };
}
