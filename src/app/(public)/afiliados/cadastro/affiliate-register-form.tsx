"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAffiliateAction } from "@/app/actions/affiliates";
import { PasswordInput } from "@/components/password-input";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field } from "@/components/ui";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = { ok: false };

export function AffiliateRegisterForm() {
  const [state, formAction] = useActionState(
    registerAffiliateAction,
    initialState,
  );
  const values = state.values ?? {};

  return (
    <div className="card card-pad">
      {state.message ? (
        <div className="mb-5">
          <Alert tone="danger">{state.message}</Alert>
        </div>
      ) : null}

      <form action={formAction} className="space-y-4">
        <Field label="Nome completo" name="name" error={state.fieldErrors?.name}>
          <input
            id="name"
            name="name"
            required
            autoComplete="name"
            className="input"
            placeholder="Maria Silva"
            defaultValue={values.name}
          />
        </Field>

        <Field
          label="E-mail"
          name="email"
          error={state.fieldErrors?.email}
          hint="É por aqui que você entra na área do afiliado."
        >
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="input"
            placeholder="voce@email.com"
            defaultValue={values.email}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="CPF ou CNPJ"
            name="document"
            error={state.fieldErrors?.document}
          >
            <input
              id="document"
              name="document"
              required
              inputMode="numeric"
              className="input"
              placeholder="000.000.000-00"
              defaultValue={values.document}
            />
          </Field>

          <Field
            label="Chave Pix"
            name="pixKey"
            error={state.fieldErrors?.pixKey}
            hint="Recebe os repasses."
          >
            <input
              id="pixKey"
              name="pixKey"
              required
              className="input"
              placeholder="CPF, e-mail ou telefone"
              defaultValue={values.pixKey}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Senha" name="password" error={state.fieldErrors?.password}>
            <PasswordInput
              id="password"
              name="password"
              required
              autoComplete="new-password"
              minLength={8}
              placeholder="Ao menos 8 caracteres"
            />
          </Field>

          <Field
            label="Confirmar senha"
            name="confirmPassword"
            error={state.fieldErrors?.confirmPassword}
          >
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              required
              autoComplete="new-password"
            />
          </Field>
        </div>

        <Field
          label="Como pretende divulgar? (opcional)"
          name="notes"
          error={state.fieldErrors?.notes}
          hint="Site, redes sociais, grupos. Ajuda no suporte, não bloqueia o cadastro."
        >
          <textarea
            id="notes"
            name="notes"
            rows={2}
            maxLength={600}
            className="input"
            placeholder="Ex.: canal no YouTube sobre varejo"
            defaultValue={values.notes}
          />
        </Field>

        <label className="flex items-start gap-3 rounded-xl border border-ink-200 bg-ink-50 px-4 py-3">
          <input
            type="checkbox"
            name="acceptTerms"
            required
            className="mt-0.5 size-4 shrink-0 rounded border-ink-300"
          />
          <span className="text-xs leading-relaxed text-ink-600">
            Li e aceito os{" "}
            <Link
              href="/termos"
              target="_blank"
              className="font-semibold text-brand-700 underline decoration-brand-300 underline-offset-2"
            >
              Termos de Uso
            </Link>{" "}
            e a{" "}
            <Link
              href="/privacidade"
              target="_blank"
              className="font-semibold text-brand-700 underline decoration-brand-300 underline-offset-2"
            >
              Política de Privacidade
            </Link>
            , incluindo as regras do programa de afiliados.
          </span>
        </label>
        {state.fieldErrors?.acceptTerms ? (
          <p className="text-xs text-red-600">{state.fieldErrors.acceptTerms}</p>
        ) : null}

        <SubmitButton className="btn btn-primary w-full" pendingLabel="Criando...">
          Criar cadastro e receber link
        </SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        Já é afiliado?{" "}
        <Link href="/afiliados/entrar" className="font-semibold text-brand-600">
          Entrar
        </Link>
      </p>
    </div>
  );
}
