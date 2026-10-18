"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAffiliateAction } from "@/app/actions/affiliates";
import { PasswordInput } from "@/components/password-input";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field } from "@/components/ui";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = { ok: false };

export function AffiliateLoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(loginAffiliateAction, initialState);

  return (
    <div className="card card-pad">
      {state.message ? (
        <div className="mb-5">
          <Alert tone="danger">{state.message}</Alert>
        </div>
      ) : null}

      <form action={formAction} className="space-y-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}

        <Field label="E-mail" name="email" error={state.fieldErrors?.email}>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="input"
            placeholder="voce@email.com"
          />
        </Field>

        <Field label="Senha" name="password" error={state.fieldErrors?.password}>
          <PasswordInput
            id="password"
            name="password"
            required
            autoComplete="current-password"
          />
        </Field>

        <SubmitButton className="btn btn-primary w-full" pendingLabel="Entrando...">
          Entrar
        </SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        Ainda não é afiliado?{" "}
        <Link
          href="/afiliados/cadastro"
          className="font-semibold text-brand-600"
        >
          Criar cadastro
        </Link>
      </p>
    </div>
  );
}
