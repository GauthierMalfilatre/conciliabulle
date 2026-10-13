"use client";

import { useActionState } from "react";
import { joinDossierAction, type JoinState } from "@/app/actions/dossiers";
import { Button, Field, Input } from "@/components/ui";

export function JoinForm({ demoCode }: { demoCode: string }) {
  const [state, formAction, pending] = useActionState<JoinState, FormData>(joinDossierAction, {});
  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <Field id="code" label="Code dossier" error={state.error}>
        <Input
          key={state.error}
          id="code"
          name="code"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="MED-0000-XX"
          defaultValue={state.code}
          aria-invalid={Boolean(state.error)}
          aria-describedby={state.error ? "code-error" : "code-aide"}
          className="h-14 font-mono text-2xl tracking-widest uppercase"
          required
        />
      </Field>
      <p id="code-aide" className="-mt-2 text-base text-muted-foreground">
        Il figure sur le document remis par votre conciliateur. Démonstration : {demoCode}
      </p>
      <Button type="submit" size="lg" disabled={pending} className="h-14 text-lg">
        {pending ? "Vérification…" : "Accéder à mon dossier"}
      </Button>
    </form>
  );
}
