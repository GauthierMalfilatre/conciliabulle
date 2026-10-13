import type { ReactNode } from "react";
import { Suspense } from "react";
import { resetSettingsAction, saveSettingsAction } from "@/app/actions/reglages";
import { Container } from "@/components/layout";
import { ProBand, SettingsTabs } from "@/components/pro";
import { Alert, Button, Card, Field, Icon, Input, Select, Textarea, type IconName } from "@/components/ui";
import { getPlatformSettings, OPTIONS } from "@/lib/api/reglages";
import { requirePro } from "@/lib/auth/session";
import { param, type SearchParams } from "@/lib/search-params";

export const metadata = { title: "Réglages du service" };

export default function ReglagesPage({ searchParams }: PageProps<"/pro/parametres/reglages">) {
  return (
    <>
      <ProBand title="Paramètres">
        <SettingsTabs current="/pro/parametres/reglages" />
      </ProBand>
      <Container className="flex max-w-4xl flex-col gap-6 py-8">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" aria-busy><span className="sr-only">Chargement…</span></div>}>
          <Reglages searchParams={searchParams} />
        </Suspense>
      </Container>
    </>
  );
}

const SECTION_LABEL: Record<string, string> = {
  sessions: "Sessions de connexion",
  "rendez-vous": "Rendez-vous",
  notifications: "Notifications",
  site: "Informations du site",
};

const check =
  "flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-4 text-base has-checked:border-primary has-checked:bg-secondary";

/** "8 heures", "7 jours" */
function dureeSession(heures: number) {
  if (heures % 24 === 0 && heures >= 24) {
    const j = heures / 24;
    return `${j} jour${j > 1 ? "s" : ""}`;
  }
  return `${heures} heure${heures > 1 ? "s" : ""}`;
}

/** "30 minutes", "Jamais" */
function inactivite(minutes: number) {
  if (minutes === 0) return "Jamais";
  return minutes >= 60 ? `${minutes / 60} heure${minutes > 60 ? "s" : ""}` : `${minutes} minutes`;
}

/** A settings card with its own form and save button. */
function Section({
  id,
  icon,
  title,
  description,
  children,
}: {
  id: string;
  icon: IconName;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-24 p-6">
      <h2 className="flex items-center gap-3 text-2xl">
        <span className="grid size-11 place-items-center rounded-full bg-secondary text-primary">
          <Icon name={icon} className="size-5" />
        </span>
        {title}
      </h2>
      <p className="mt-2 text-base text-muted-foreground">{description}</p>
      <form action={saveSettingsAction} className="mt-5 flex flex-col gap-5">
        <input type="hidden" name="section" value={id} />
        {children}
        <Button type="submit" className="self-start">
          <Icon name="check" /> Enregistrer
        </Button>
      </form>
    </Card>
  );
}

async function Reglages({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  await requirePro();
  const s = await getPlatformSettings();
  const saved = param(sp, "enregistre");

  return (
    <>
      {saved && <Alert variant="success" title={`${SECTION_LABEL[saved] ?? "Réglages"} : enregistré`}>Les changements s&apos;appliquent immédiatement.</Alert>}
      {param(sp, "reinitialise") && <Alert variant="info" title="Valeurs par défaut rétablies" />}
      {param(sp, "erreur") && <Alert variant="destructive" title={param(sp, "erreur")!} />}

      <p className="text-base text-muted-foreground">
        Ces réglages valent pour tout le service : vos rendez-vous, ceux des autres conciliateurs et l&apos;espace des
        justiciables.
      </p>

      <nav aria-label="Sections" className="flex flex-wrap gap-2">
        {Object.entries(SECTION_LABEL).map(([id, label]) => (
          <a key={id} href={`#${id}`} className="rounded-full border border-border bg-card px-4 py-2 text-base font-semibold text-primary hover:border-primary">
            {label}
          </a>
        ))}
      </nav>

      <Section
        id="sessions"
        icon="shield"
        title="Sessions de connexion"
        description="Combien de temps une personne reste connectée. S'applique aux prochaines connexions ; les sessions ouvertes gardent leurs limites."
      >
        <div className="grid gap-5 md:grid-cols-3">
          <Field id="sessionDureeHeures" label="Durée maximale d'une session">
            <Select id="sessionDureeHeures" name="sessionDureeHeures" defaultValue={String(s.sessionDureeHeures)}>
              {OPTIONS.sessionDureeHeures.map((h) => (
                <option key={h} value={h}>
                  {dureeSession(h)}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="inactiviteMinutes" label="Déconnexion après inactivité">
            <Select id="inactiviteMinutes" name="inactiviteMinutes" defaultValue={String(s.inactiviteMinutes)}>
              {OPTIONS.inactiviteMinutes.map((m) => (
                <option key={m} value={m}>
                  {inactivite(m)}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="maxEssaisCodeDossier" label="Essais du code dossier">
            <Select id="maxEssaisCodeDossier" name="maxEssaisCodeDossier" defaultValue={String(s.maxEssaisCodeDossier)}>
              {OPTIONS.maxEssaisCodeDossier.map((n) => (
                <option key={n} value={n}>
                  {n} essais
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <p className="rounded-lg bg-secondary p-4 text-base">
          Conseil : pour des personnes peu à l&apos;aise, une inactivité de 30 minutes laisse le temps de chercher un
          document sans être déconnecté, tout en protégeant un ordinateur partagé.
        </p>
      </Section>

      <Section
        id="rendez-vous"
        icon="calendar"
        title="Rendez-vous"
        description="Règles de réservation pour les justiciables."
      >
        <div className="grid gap-5 md:grid-cols-3">
          <Field id="delaiModificationHeures" label="Modifier ou annuler en ligne jusqu'à">
            <Select id="delaiModificationHeures" name="delaiModificationHeures" defaultValue={String(s.delaiModificationHeures)}>
              {OPTIONS.delaiModificationHeures.map((h) => (
                <option key={h} value={h}>
                  {h} heures avant
                </option>
              ))}
            </Select>
          </Field>
          <Field id="maxRdvAVenir" label="Rendez-vous à venir par personne">
            <Select id="maxRdvAVenir" name="maxRdvAVenir" defaultValue={String(s.maxRdvAVenir)}>
              {OPTIONS.maxRdvAVenir.map((n) => (
                <option key={n} value={n}>
                  {n === 0 ? "Sans limite" : `${n} au maximum`}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="dureeReunionMinutes" label="Durée d'une réunion de conciliation">
            <Select id="dureeReunionMinutes" name="dureeReunionMinutes" defaultValue={String(s.dureeReunionMinutes)}>
              {OPTIONS.dureeReunionMinutes.map((m) => (
                <option key={m} value={m}>
                  {m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60}` : ""}` : `${m} min`}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <fieldset>
          <legend className="mb-2 text-base font-medium">Durées de rendez-vous proposées dans l&apos;onglet Horaires</legend>
          <div className="flex flex-wrap gap-2">
            {OPTIONS.dureesRdv.map((d) => (
              <label key={d} className={check}>
                <input type="checkbox" name="dureesRdvAutorisees" value={d} defaultChecked={s.dureesRdvAutorisees.includes(d)} className="size-5 accent-[#0f6cbd]" />
                {d} minutes
              </label>
            ))}
          </div>
        </fieldset>
      </Section>

      <Section
        id="notifications"
        icon="message"
        title="Notifications"
        description="SMS envoyés aux justiciables et délai promis pour les rappels."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <label className={check}>
            <input type="checkbox" name="rappelVeille" defaultChecked={s.rappelVeille} className="size-5 accent-[#0f6cbd]" />
            Rappel SMS la veille du rendez-vous
          </label>
          <label className={check}>
            <input type="checkbox" name="rappelJourMeme" defaultChecked={s.rappelJourMeme} className="size-5 accent-[#0f6cbd]" />
            Rappel SMS le jour même
          </label>
        </div>
        <Field id="delaiRappelJours" label="Délai promis pour rappeler une personne">
          <Select id="delaiRappelJours" name="delaiRappelJours" defaultValue={String(s.delaiRappelJours)} className="md:w-80">
            {OPTIONS.delaiRappelJours.map((j) => (
              <option key={j} value={j}>
                {j} jour{j > 1 ? "s" : ""} ouvré{j > 1 ? "s" : ""}
              </option>
            ))}
          </Select>
        </Field>
      </Section>

      <Section
        id="site"
        icon="building"
        title="Informations du site"
        description="Affichées sur toutes les pages."
      >
        <Field id="numeroAide" label="Numéro d'aide (pied de page, connexion, réservation)">
          <Input id="numeroAide" name="numeroAide" type="tel" defaultValue={s.numeroAide} className="md:w-80" required />
        </Field>
        <label className={check}>
          <input type="checkbox" name="bandeauActif" defaultChecked={s.bandeau.actif} className="size-5 accent-[#0f6cbd]" />
          Afficher un bandeau d&apos;information en haut du site
        </label>
        <Field id="bandeauMessage" label="Message du bandeau">
          <Textarea id="bandeauMessage" name="bandeauMessage" defaultValue={s.bandeau.message} placeholder="Ex. : Les permanences seront fermées du 24 décembre au 2 janvier." />
        </Field>
      </Section>

      <form action={resetSettingsAction} className="self-start">
        <Button type="submit" variant="ghost">
          Rétablir les valeurs par défaut
        </Button>
      </form>
    </>
  );
}
