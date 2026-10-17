"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import { PasswordInput } from "@/components/password-input";
import { Alert, Card } from "@/components/ui";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = { ok: false };

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <Card className="card-pad">
      <h1 className="text-xl font-bold text-ink-900">Entrar na sua loja</h1>
      <p className="mt-1 text-sm text-ink-500">
        Acesse o painel de estoque, caixa e financeiro.
      </p>

      {state.message ? (
        <div className="mt-5">
          <Alert tone="danger">{state.message}</Alert>
        </div>
      ) : null}

      <form action={formAction} className="mt-6 space-y-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}

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

        <div>
          <label className="label" htmlFor="password">
            Senha
          </label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
          />
          {state.fieldErrors?.password ? (
            <p className="mt-1 text-xs text-red-600">
              {state.fieldErrors.password}
            </p>
          ) : null}
        </div>

        <SubmitButton className="btn btn-primary w-full" pendingLabel="Entrando...">
          Entrar
        </SubmitButton>
      </form>

      <div className="mt-5 flex flex-wrap justify-between gap-2 text-sm">
        <Link href="/esqueci-senha" className="font-semibold text-brand-600">
          Esqueci minha senha
        </Link>
        <Link
          href="/cadastro/confirmar"
          className="font-semibold text-ink-600 hover:text-ink-800"
        >
          Reenviar confirmação
        </Link>
      </div>

      <p className="mt-6 text-center text-sm text-ink-500">
        Ainda não tem loja?{" "}
        <Link href="/cadastro" className="font-semibold text-brand-600">
          Criar agora
        </Link>
      </p>
    </Card>
  );
}
