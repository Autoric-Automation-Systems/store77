"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerStoreAction } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Card } from "@/components/ui";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = { ok: false };

export function RegisterForm() {
  const [state, formAction] = useActionState(registerStoreAction, initialState);

  return (
    <Card className="card-pad">
      <h1 className="text-xl font-bold text-ink-900">Criar minha loja</h1>
      <p className="mt-1 text-sm text-ink-500">
        Em segundos você tem painel de estoque e vitrine online.
      </p>

      {state.message ? (
        <div className="mt-5">
          <Alert tone="danger">{state.message}</Alert>
        </div>
      ) : null}

      <form action={formAction} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="storeName">
            Nome da loja
          </label>
          <input
            id="storeName"
            name="storeName"
            required
            className="input"
            placeholder="Loja do Bairro"
          />
          {state.fieldErrors?.storeName ? (
            <p className="mt-1 text-xs text-red-600">
              {state.fieldErrors.storeName}
            </p>
          ) : null}
        </div>

        <div>
          <label className="label" htmlFor="name">
            Seu nome
          </label>
          <input
            id="name"
            name="name"
            required
            autoComplete="name"
            className="input"
            placeholder="Maria Silva"
          />
          {state.fieldErrors?.name ? (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.name}</p>
          ) : null}
        </div>

        <div>
          <label className="label" htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
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
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="input"
            placeholder="Mínimo de 8 caracteres"
          />
          {state.fieldErrors?.password ? (
            <p className="mt-1 text-xs text-red-600">
              {state.fieldErrors.password}
            </p>
          ) : null}
        </div>

        <SubmitButton
          className="btn btn-primary w-full"
          pendingLabel="Criando loja..."
        >
          Criar loja e entrar
        </SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        Já tem conta?{" "}
        <Link href="/login" className="font-semibold text-brand-600">
          Entrar
        </Link>
      </p>
    </Card>
  );
}
