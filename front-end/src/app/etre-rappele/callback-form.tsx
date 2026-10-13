"use client";

import { useActionState } from "react";
import { requestCallback, type CallbackState } from "@/app/actions/callbacks";
import { Button, Field, Icon, Input, Select } from "@/components/ui";
import { DOMAINES, MOMENTS } from "@/lib/api/referentiel";

export function CallbackForm({
  defaults,
  conciliateurId,
}: {
  defaults: { nom: string; telephone: string };
  conciliateurId?: string;
}) {
  const [state, formAction, pending] = useActionState<CallbackState, FormData>(requestCallback, {});
  const v = state.values;

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {conciliateurId && <input type="hidden" name="conciliateur" value={conciliateurId} />}

      <Field id="nom" label="Votre nom" error={state.errors?.nom}>
        <Input
          id="nom"
          name="nom"
          autoComplete="name"
          defaultValue={v?.nom ?? defaults.nom}
          aria-invalid={Boolean(state.errors?.nom)}
          aria-describedby={state.errors?.nom ? "nom-error" : undefined}
          required
        />
      </Field>

      <Field id="telephone" label="Votre numéro de téléphone" error={state.errors?.telephone}>
        <Input
          id="telephone"
          name="telephone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="06 12 34 56 78"
          defaultValue={v?.telephone ?? defaults.telephone}
          aria-invalid={Boolean(state.errors?.telephone)}
          aria-describedby={state.errors?.telephone ? "telephone-error" : undefined}
          className="text-xl tracking-wide"
          required
        />
      </Field>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-base font-medium">Quand préférez-vous être appelé ?</legend>
        {Object.entries(MOMENTS).map(([value, label]) => (
          <label
            key={value}
            className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 border-border bg-card px-4 text-base has-checked:border-primary has-checked:bg-secondary"
          >
            <input
              type="radio"
              name="moment"
              value={value}
              defaultChecked={(v?.moment ?? "indifferent") === value}
              className="size-5 accent-[#0f6cbd]"
            />
            {label}
          </label>
        ))}
      </fieldset>

      <Field id="motif" label="Pour quel sujet ? (facultatif)">
        <Select id="motif" name="motif" defaultValue={v?.motif ?? ""}>
          <option value="">Je ne sais pas encore</option>
          {Object.entries(DOMAINES).map(([code, d]) => (
            <option key={code} value={code}>
              {d.motif}
            </option>
          ))}
        </Select>
      </Field>

      <Button type="submit" size="lg" disabled={pending} className="h-14 text-lg">
        <Icon name="phone" className="size-5" />
        {pending ? "Envoi…" : "Être rappelé"}
      </Button>
    </form>
  );
}
