"use client";

import { useActionState } from "react";
import { saveBillingProfileAction } from "@/app/actions/billing";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Badge, Card, CardHeader, Field } from "@/components/ui";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = { ok: false };

export function BillingProfileCard({
  legalName,
  document,
  email,
  missing,
}: {
  legalName: string;
  document: string;
  email: string;
  /** Falta documento válido: a contratação fica bloqueada até preencher. */
  missing: boolean;
}) {
  const [state, formAction] = useActionState(
    saveBillingProfileAction,
    initialState,
  );

  return (
    <Card>
      <CardHeader
        title="Dados de cobrança"
        description="O gateway exige razão social e CPF ou CNPJ para emitir a cobrança da assinatura."
        action={
          missing ? (
            <Badge tone="warning">Pendente</Badge>
          ) : (
            <Badge tone="success">Completo</Badge>
          )
        }
      />
      <form action={formAction} className="card-pad space-y-4">
        {state.message ? (
          <Alert tone={state.ok ? "success" : "danger"}>{state.message}</Alert>
        ) : null}

        {missing && !state.message ? (
          <Alert tone="warning">
            Sem CPF ou CNPJ não é possível contratar um plano: o gateway recusa
            o cadastro do cliente.
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Razão social ou nome completo"
            name="legalName"
            error={state.fieldErrors?.legalName}
          >
            <input
              id="legalName"
              name="legalName"
              required
              maxLength={160}
              className="input"
              defaultValue={state.values?.legalName ?? legalName}
              placeholder="Como consta no CPF ou CNPJ"
            />
          </Field>

          <Field
            label="CPF ou CNPJ"
            name="document"
            error={state.fieldErrors?.document}
            hint="Usado na nota fiscal e no cadastro do gateway."
          >
            <input
              id="document"
              name="document"
              required
              inputMode="numeric"
              className="input"
              defaultValue={state.values?.document ?? document}
              placeholder="000.000.000-00"
            />
          </Field>

          <Field
            label="E-mail de cobrança"
            name="email"
            error={state.fieldErrors?.email}
            hint="Para onde a fatura e os avisos de vencimento são enviados."
          >
            <input
              id="email"
              name="email"
              type="email"
              required
              className="input"
              defaultValue={state.values?.email ?? email}
            />
          </Field>
        </div>

        <SubmitButton className="btn btn-secondary" pendingLabel="Salvando...">
          Salvar dados de cobrança
        </SubmitButton>
      </form>
    </Card>
  );
}
