"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { register, type RegisterState } from "@/app/actions/auth";
import { Alert, Button, Field, Icon, Input } from "@/components/ui";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(register, {});
  const next = useSearchParams().get("next") ?? "/";
  const e = state.errors ?? {};
  const v = state.values;
  const described = (id: keyof typeof e, hint = false) =>
    e[id] ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="next" value={next} />
      {e.form && <Alert variant="destructive">{e.form}</Alert>}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="prenom" label="Prénom" error={e.prenom}>
          <Input id="prenom" name="prenom" autoComplete="given-name" defaultValue={v?.prenom} aria-invalid={Boolean(e.prenom)} aria-describedby={described("prenom")} required />
        </Field>
        <Field id="nom" label="Nom" error={e.nom}>
          <Input id="nom" name="nom" autoComplete="family-name" defaultValue={v?.nom} aria-invalid={Boolean(e.nom)} aria-describedby={described("nom")} required />
        </Field>
      </div>
      <Field id="email" label="Adresse email" error={e.email}>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="vous@exemple.fr" defaultValue={v?.email} aria-invalid={Boolean(e.email)} aria-describedby={described("email")} required />
      </Field>
      <Field id="password" label="Mot de passe" hint="8 caractères au moins. Évitez une date de naissance ou un mot trop simple." error={e.password}>
        <Input id="password" name="password" type="password" autoComplete="new-password" aria-invalid={Boolean(e.password)} aria-describedby={described("password", true)} required />
      </Field>
      <Button type="submit" size="lg" disabled={pending} className="h-14 text-lg">
        {pending ? "Création du compte…" : "Créer mon compte"}
        {!pending && <Icon name="arrowRight" className="size-5" />}
      </Button>
      <p className="text-center text-base">
        Déjà un compte ?{" "}
        <Link href={next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`} className="font-semibold text-primary hover:underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
