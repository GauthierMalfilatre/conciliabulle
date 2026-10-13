"use client";

import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";
import { login, type LoginState } from "@/app/actions/auth";
import { Alert, Button, Field, Icon, Input, type IconName } from "@/components/ui";

const DEMO_ACCOUNTS: { email: string; label: string; icon: IconName }[] = [
  { email: "justiciable@test.fr", label: "Justiciable", icon: "users" },
  { email: "conciliateur@test.fr", label: "Conciliateur", icon: "briefcase" },
];

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, {});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const expire = params.get("expire");

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-5">
        <input type="hidden" name="next" value={next} />
        {expire && !state.error && (
          <Alert variant="info" title="Vous avez été déconnecté pour votre sécurité">
            {expire === "inactive"
              ? "Vous n'avez rien fait depuis un moment. Reconnectez-vous pour continuer."
              : "Votre session a atteint sa durée maximale. Reconnectez-vous pour continuer."}
          </Alert>
        )}
        {state.error && <Alert variant="destructive">{state.error}</Alert>}
        <Field id="email" label="Adresse email">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="vous@exemple.fr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(state.error)}
            className="h-14 text-lg"
            required
          />
        </Field>
        <Field id="password" label="Mot de passe">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(state.error)}
            className="h-14 text-lg"
            required
          />
        </Field>
        <Button type="submit" size="lg" disabled={pending} className="h-14 text-lg">
          {pending ? "Connexion…" : "Se connecter"}
          {!pending && <Icon name="arrowRight" className="size-5" />}
        </Button>
      </form>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          Comptes de démonstration
          <span className="h-px flex-1 bg-border" />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {DEMO_ACCOUNTS.map((account) => (
            <Button
              key={account.email}
              variant="outline"
              onClick={() => {
                setEmail(account.email);
                setPassword("password");
              }}
            >
              <Icon name={account.icon} />
              {account.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
