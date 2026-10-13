import { api, apiOrNull } from "./http";
import { departement, HORIZON_SEMAINES } from "./referentiel";
import { addDays, startOfDay } from "./schedule";
import type { Conciliateur, ConciliateurSearch, ConciliateurWithSlots, Slot } from "./types";

// GET conciliateurs, GET conciliateurs/{id}, GET conciliateurs/{id}/slots

export type ApiConciliateur = { id: number; first_name: string; last_name: string; city: string; department: string; bio: string };
export type ApiSlot = { id: number; start: string; end: string; location: string };

/** Days of availability shown on each search result. */
const PREVIEW_DAYS = 5;

export function toConciliateur(c: ApiConciliateur): Conciliateur {
  return {
    id: String(c.id),
    nom: `${c.first_name} ${c.last_name}`.trim(),
    departement: departement(c.department),
    ville: c.city,
    presentation: c.bio,
    domaines: [],
    langues: [],
    // Appointments happen where the slot says.
    modes: ["sur_place"],
  };
}

export function toSlot(conciliateurId: string, s: ApiSlot): Slot {
  return { id: `${conciliateurId}.${s.id}`, conciliateurId, debut: s.start, fin: s.end, modes: ["sur_place"], lieu: s.location };
}

/** `"3.128"` → conciliateur 3, API slot 128. */
export function parseSlotId(id: string) {
  const m = /^(\d+)\.(\d+)$/.exec(id);
  return m ? { conciliateurId: m[1], slotId: Number(m[2]) } : null;
}

function normalize(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/** Free slots from `from` (default: now) to `to` (default: the end of the published horizon). */
async function freeSlots(conciliateurId: string, from?: Date, to?: Date) {
  const data = await apiOrNull<ApiSlot[]>(`conciliateurs/${conciliateurId}/slots`, {
    query: { from: (from ?? new Date()).toISOString(), to: to?.toISOString() },
  });
  return (data ?? []).map((s) => toSlot(conciliateurId, s));
}

/** GET conciliateurs?department=&available= — the name or city filter is applied here. */
export async function listConciliateurs({ departement, dispo }: Pick<ConciliateurSearch, "departement" | "dispo"> = {}) {
  const data = await api<ApiConciliateur[]>("conciliateurs", {
    query: { department: departement, available: dispo ? "true" : undefined },
  });
  return data.map(toConciliateur);
}

export async function searchConciliateurs({ q, departement, dispo, limit = 6 }: ConciliateurSearch) {
  const text = q ? normalize(q.trim()) : "";
  const matches = (await listConciliateurs({ departement, dispo })).filter(
    (c) => !text || normalize(c.nom).includes(text) || normalize(c.ville).includes(text),
  );
  const today = startOfDay(new Date());
  const days = Array.from({ length: PREVIEW_DAYS }, (_, i) => addDays(today, i).toISOString());
  const previewEnd = addDays(today, PREVIEW_DAYS).getTime();
  const items: ConciliateurWithSlots[] = await Promise.all(
    matches.slice(0, limit).map(async (c) => {
      const slots = await freeSlots(c.id);
      return {
        ...c,
        apercu: { days, slots: slots.filter((s) => new Date(s.debut).getTime() < previewEnd) },
        prochainCreneau: slots[0],
      };
    }),
  );
  return { items, total: matches.length };
}

/** GET conciliateurs/{id} → null if unknown or not verified. */
export async function getConciliateur(id: string) {
  if (!/^\d+$/.test(id)) return null;
  const c = await apiOrNull<ApiConciliateur>(`conciliateurs/${id}`);
  if (!c) return null;
  const next = await freeSlots(id);
  return {
    ...toConciliateur(c),
    horizonSemaines: HORIZON_SEMAINES,
    /** Length of the next appointment, when there is one. */
    dureeMinutes: next[0] && (new Date(next[0].fin).getTime() - new Date(next[0].debut).getTime()) / 60_000,
    /** Where the upcoming slots take place. */
    lieux: [...new Set(next.map((s) => s.lieu))],
  };
}

/** `week` 0 is the 7 days starting today. */
export async function getWeekSlots(conciliateurId: string, week: number) {
  const from = addDays(startOfDay(new Date()), week * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i).toISOString());
  const slots = await freeSlots(conciliateurId, week === 0 ? new Date() : from, addDays(from, 7));
  return { days, slots };
}

/** Next bookable slots of a conciliateur, e.g. to suggest alternatives. */
export async function getNextSlots(conciliateurId: string, count = 3) {
  return (await freeSlots(conciliateurId)).slice(0, count);
}

/** A free slot, or null if it was taken, deleted or has passed. */
export async function getSlot(id: string) {
  const parsed = parseSlotId(id);
  if (!parsed) return null;
  return (await freeSlots(parsed.conciliateurId)).find((s) => s.id === id) ?? null;
}
