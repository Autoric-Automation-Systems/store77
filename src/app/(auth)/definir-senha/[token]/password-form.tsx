"use client";

import Link from "next/link";
import { useActionState } from "react";
import { setPasswordAction } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import { PasswordInput } from "@/components/password-input";
import { Alert, Card } from "@/components/ui";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = { ok: false };

export function PasswordForm({
  token,
  name,
  email,
  mode,
}: {
  token: string;
  name: string;
  email: string;
  mode: "create" | "reset";
}) {
  const [state, formAction] = useActionState(setPasswordAction, initialState);
  const isReset = mode === "reset";

  return (
    <Card className="card-pad">
      <h1 className="text-xl font-bold text-ink-900">
        {isReset ? "Redefina sua senha" : "Crie sua senha"}
      </h1>
      <p className="mt-1 text-sm text-ink-500">
        Olá, {name}. Defina a senha da conta{" "}
        <strong className="text-ink-700">{email}</strong>.
      </p>

      {state.message ? (
        <div className="mt-5">
          <Alert tone="danger">{state.message}</Alert>
        </div>
      ) : null}

      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="token" value={token} />

        <div>
          <label className="label" htmlFor="password">
            {isReset ? "Nova senha" : "Senha"}
          </label>
          <PasswordInput
            id="password"
            name="password"
            required
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
            placeholder="Mínimo de 8 caracteres"
          />
          {state.fieldErrors?.password ? (
            <p className="mt-1 text-xs text-red-600">
              {state.fieldErrors.password}
            </p>
          ) : null}
        </div>

        <div>
          <label className="label" htmlFor="confirmPassword">
            Confirme a senha
          </label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            required
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
            placeholder="Repita a senha"
          />
          {state.fieldErrors?.confirmPassword ? (
            <p className="mt-1 text-xs text-red-600">
              {state.fieldErrors.confirmPassword}
            </p>
          ) : null}
        </div>

        <SubmitButton
          className="btn btn-primary w-full"
          pendingLabel="Salvando..."
        >
          {isReset ? "Redefinir senha" : "Criar senha e entrar"}
        </SubmitButton>
      </form>

      <p className="mt-4 text-xs leading-relaxed text-ink-500">
        Este link só pode ser usado uma vez. Ao salvar, você entra direto no
        painel da loja.
      </p>

      <p className="mt-6 text-center text-sm text-ink-500">
        <Link href="/login" className="font-semibold text-brand-600">
          Voltar para o login
        </Link>
      </p>
    </Card>
  );
}
