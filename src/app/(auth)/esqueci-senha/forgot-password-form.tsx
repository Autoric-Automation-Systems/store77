"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordResetAction } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Card } from "@/components/ui";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = { ok: false };

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(
    requestPasswordResetAction,
    initialState,
  );

  return (
    <Card className="card-pad">
      <h1 className="text-xl font-bold text-ink-900">Recuperar senha</h1>
      <p className="mt-1 text-sm text-ink-500">
        Informe o e-mail da conta. Enviaremos um link para você definir uma nova
        senha.
      </p>

      {state.message ? (
        <div className="mt-5">
          <Alert tone={state.ok ? "success" : "danger"}>{state.message}</Alert>
        </div>
      ) : null}

      {state.ok ? (
        <p className="mt-5 text-sm text-ink-600">
          O link expira em 1 hora e só pode ser usado uma vez.
        </p>
      ) : (
        <form action={formAction} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="input"
              placeholder="voce@sualoja.com"
            />
            {state.fieldErrors?.email ? (
              <p className="mt-1 text-xs text-red-600">
                {state.fieldErrors.email}
              </p>
            ) : null}
          </div>

          <SubmitButton
            className="btn btn-primary w-full"
            pendingLabel="Enviando..."
          >
            Enviar link
          </SubmitButton>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-ink-500">
        Lembrou a senha?{" "}
        <Link href="/login" className="font-semibold text-brand-600">
          Entrar
        </Link>
      </p>
    </Card>
  );
}
