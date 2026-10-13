import { getAppointment } from "@/lib/api/appointments";
import { getCurrentUser } from "@/lib/auth/session";

function icsDate(iso: string) {
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// Neutral wording: the event may show on a shared calendar or lock screen.
export async function GET(_request: Request, ctx: RouteContext<"/mes-rendez-vous/[id]/agenda">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  const a = user?.status === "justiciable" ? await getAppointment(id) : null;
  if (!a) return new Response("Introuvable", { status: 404 });

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ConciliaBulle//FR",
    "BEGIN:VEVENT",
    `UID:${a.id}@conciliabulle`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(a.debut)}`,
    `DTEND:${icsDate(a.fin)}`,
    `SUMMARY:Rendez-vous avec ${a.conciliateur.nom}`,
    `LOCATION:${a.lieu.replace(/[,;]/g, "\\$&")}`,
    ...(a.conciliateur.telephone ? [`DESCRIPTION:Contact : ${a.conciliateur.telephone}`] : []),
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    "DESCRIPTION:Rendez-vous demain",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="rendez-vous-${a.id}.ics"`,
    },
  });
}
