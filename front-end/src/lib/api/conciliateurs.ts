import { fakeLatency } from "./latency";
import { addDays, dayStarts, parseSlotId, slotId, startOfDay } from "./schedule";
import { allConciliateurs, bookedSlotIds, conciliateurById, parametres } from "./store";
import type { Conciliateur, ConciliateurSearch, ConciliateurWithSlots, Domaine, Mode, Slot } from "./types";

// Fake backend: swap these functions for `fetch` calls to the real API.

/** Days of availability shown on each search result. */
const PREVIEW_DAYS = 5;

function normalize(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function toSlot(c: Conciliateur, day: Date, hhmm: string): Slot {
  const p = parametres(c.id);
  const debut = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Number(hhmm.slice(0, 2)), Number(hhmm.slice(2)));
  const fin = new Date(debut.getTime() + p.dureeMinutes * 60_000);
  return { id: slotId(c.id, day, hhmm), conciliateurId: c.id, debut: debut.toISOString(), fin: fin.toISOString(), modes: c.modes };
}

/** Bookable slots, following the conciliateur's settings (hours, absences, notice, horizon). */
function generateSlots(c: Conciliateur, from: Date, days: number, booked = bookedSlotIds()): Slot[] {
  if (!c.reservationOuverte) return [];
  const p = parametres(c.id);
  const earliest = Date.now() + p.delaiMinHeures * 3_600_000;
  const horizon = addDays(startOfDay(new Date()), p.horizonSemaines * 7).getTime();
  const slots: Slot[] = [];
  for (let i = 0; i < days; i++) {
    const day = addDays(from, i);
    if (day.getTime() >= horizon) break;
    for (const hhmm of dayStarts(p, day)) {
      if (booked.has(slotId(c.id, day, hhmm))) continue;
      const slot = toSlot(c, day, hhmm);
      if (new Date(slot.debut).getTime() >= earliest) slots.push(slot);
    }
  }
  return slots;
}

export function slotFromId(id: string): Slot | null {
  const parsed = parseSlotId(id);
  const c = parsed && conciliateurById(parsed.conciliateurId);
  return parsed && c ? toSlot(c, parsed.day, parsed.hhmm) : null;
}

/** GET /conciliateurs?q=&region=&domaine=&mode=&dispo=&limit= */
export async function searchConciliateurs({ q, region, domaine, mode, dispo, limit = 6 }: ConciliateurSearch) {
  await fakeLatency(300);
  const today = startOfDay(new Date());
  const text = q ? normalize(q.trim()) : "";
  const matches = allConciliateurs().filter(
    (c) =>
      (!text || normalize(c.nom).includes(text) || normalize(c.ville).includes(text)) &&
      (!region || c.region.code === region) &&
      (!domaine || c.domaines.includes(domaine as Domaine)) &&
      (!mode || c.modes.includes(mode as Mode)) &&
      (!dispo || generateSlots(c, today, 7).length > 0),
  );
  const days = Array.from({ length: PREVIEW_DAYS }, (_, i) => addDays(today, i).toISOString());
  const items: ConciliateurWithSlots[] = matches.slice(0, limit).map((c) => ({
    ...c,
    apercu: { days, slots: generateSlots(c, today, PREVIEW_DAYS) },
    prochainCreneau: generateSlots(c, today, parametres(c.id).horizonSemaines * 7)[0],
  }));
  return { items, total: matches.length };
}

/** GET /conciliateurs/:id */
export async function getConciliateur(id: string) {
  await fakeLatency(150);
  const c = conciliateurById(id);
  return c ? { ...c, horizonSemaines: parametres(id).horizonSemaines, dureeMinutes: parametres(id).dureeMinutes } : null;
}

/** GET /conciliateurs/:id/slots?from=&to= — `week` 0 is the 7 days starting today. */
export async function getWeekSlots(conciliateurId: string, week: number) {
  await fakeLatency(200);
  const c = conciliateurById(conciliateurId);
  const from = addDays(startOfDay(new Date()), week * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i).toISOString());
  return { days, slots: c ? generateSlots(c, from, 7) : [] };
}

/** Next bookable slots of a conciliateur, e.g. to suggest alternatives. */
export async function getNextSlots(conciliateurId: string, count = 3) {
  await fakeLatency(100);
  const c = conciliateurById(conciliateurId);
  return c ? generateSlots(c, startOfDay(new Date()), parametres(c.id).horizonSemaines * 7).slice(0, count) : [];
}

/** GET /slots/:id → the slot and whether it can still be booked. */
export async function getSlot(id: string) {
  await fakeLatency(100);
  const parsed = parseSlotId(id);
  const c = parsed && conciliateurById(parsed.conciliateurId);
  if (!parsed || !c) return null;
  const slot = toSlot(c, parsed.day, parsed.hhmm);
  const available = generateSlots(c, parsed.day, 1).some((s) => s.id === id);
  return { slot, available };
}
