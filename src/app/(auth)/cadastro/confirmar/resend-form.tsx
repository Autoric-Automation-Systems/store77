"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resendConfirmationAction } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Card } from "@/components/ui";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = { ok: false };

export function ResendConfirmationForm({
  initialEmail,
  mailFailed,
}: {
  initialEmail: string;
  mailFailed: boolean;
}) {
  const [state, formAction] = useActionState(
    resendConfirmationAction,
    initialState,
  );

  return (
    <Card className="card-pad">
      <h1 className="text-xl font-bold text-ink-900">Confirme seu e-mail</h1>
      {initialEmail ? (
        <p className="mt-1 text-sm text-ink-500">
          Enviamos um link para{" "}
          <strong className="text-ink-700">{initialEmail}</strong>. Abra a
          mensagem para confirmar o cadastro e criar sua senha.
        </p>
      ) : (
        <p className="mt-1 text-sm text-ink-500">
          Informe o e-mail usado no cadastro ou no convite para receber um novo
          link de confirmação e criação de senha.
        </p>
      )}

      {mailFailed ? (
        <div className="mt-5">
          <Alert tone="warning">
            Não foi possível enviar o e-mail agora. Tente reenviar o link abaixo.
          </Alert>
        </div>
      ) : null}

      {state.message ? (
        <div className="mt-5">
          <Alert tone={state.ok ? "success" : "danger"}>{state.message}</Alert>
        </div>
      ) : null}

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
            defaultValue={initialEmail}
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
          className="btn btn-secondary w-full"
          pendingLabel="Reenviando..."
        >
          Reenviar link
        </SubmitButton>
      </form>

      <p className="mt-4 text-xs leading-relaxed text-ink-500">
        O link expira em 48 horas. Não encontrou a mensagem? Confira a caixa de
        spam ou a aba Promoções.
      </p>

      <p className="mt-6 text-center text-sm text-ink-500">
        Já criou a senha?{" "}
        <Link href="/login" className="font-semibold text-brand-600">
          Entrar
        </Link>
      </p>
    </Card>
  );
}
