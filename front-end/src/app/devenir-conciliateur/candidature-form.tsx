"use client";

import { useActionState } from "react";
import { sendCandidature, type CandidatureState } from "@/app/actions/candidatures";
import { Alert, Button, Field, Icon, Input, Select, Textarea } from "@/components/ui";
import { DEPARTEMENTS } from "@/lib/api/referentiel";

export function CandidatureForm() {
  const [state, formAction, pending] = useActionState<CandidatureState, FormData>(sendCandidature, {});
  const e = state.errors ?? {};
  const v = state.values;
  const err = (id: keyof typeof e) => ({ "aria-invalid": Boolean(e[id]), "aria-describedby": e[id] ? `${id}-error` : undefined });

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {e.form && <Alert variant="destructive">{e.form}</Alert>}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="prenom" label="Prénom" error={e.prenom}>
          <Input id="prenom" name="prenom" autoComplete="given-name" defaultValue={v?.prenom} {...err("prenom")} required />
        </Field>
        <Field id="nom" label="Nom" error={e.nom}>
          <Input id="nom" name="nom" autoComplete="family-name" defaultValue={v?.nom} {...err("nom")} required />
        </Field>
        <Field id="email" label="Adresse email" error={e.email}>
          <Input id="email" name="email" type="email" autoComplete="email" defaultValue={v?.email} {...err("email")} required />
        </Field>
        <Field id="telephone" label="Téléphone" error={e.telephone}>
          <Input id="telephone" name="telephone" type="tel" autoComplete="tel" placeholder="06 12 34 56 78" defaultValue={v?.telephone} {...err("telephone")} required />
        </Field>
      </div>
      <Field id="departement" label="Votre département" error={e.departement}>
        <Select id="departement" name="departement" defaultValue={v?.departement ?? ""} {...err("departement")} required>
          <option value="" disabled>
            Choisissez
          </option>
          {DEPARTEMENTS.map((d) => (
            <option key={d.code} value={d.code}>
              {d.code} – {d.nom}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="message" label="Votre parcours, en quelques mots (facultatif)">
        <Textarea id="message" name="message" defaultValue={v?.message} maxLength={2000} placeholder="Ex. : ancienne juriste, disponible deux demi-journées par semaine." />
      </Field>
      <div className="flex flex-col gap-1.5">
        <label className="flex cursor-pointer items-start gap-3 text-base">
          <input type="checkbox" name="consentement" className="mt-1 size-5 shrink-0 accent-[#0f6cbd]" {...err("consentement")} />
          J&apos;accepte que l&apos;association des conciliateurs de mon département me contacte et conserve ces
          informations pour traiter ma demande.
        </label>
        {e.consentement && (
          <p id="consentement-error" className="text-sm font-medium text-destructive">
            {e.consentement}
          </p>
        )}
      </div>
      <Button type="submit" size="lg" disabled={pending} className="h-14 self-start px-8 text-lg">
        <Icon name="check" className="size-5" />
        {pending ? "Envoi…" : "Envoyer ma demande"}
      </Button>
    </form>
  );
}
