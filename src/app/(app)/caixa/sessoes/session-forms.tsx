"use client";

import { useActionState } from "react";
import {
  closeCashSessionAction,
  openCashSessionAction,
  registerCashMovementAction,
} from "@/app/actions/cash";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Card, CardHeader } from "@/components/ui";
import { formatBRL } from "@/lib/format";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = { ok: false };

const MOVEMENT_LABELS = {
  SANGRIA: "Sangria (retirada de dinheiro)",
  SUPRIMENTO: "Suprimento (troco)",
  ENTRADA: "Entrada avulsa",
  SAIDA: "Saída avulsa",
} as const;

export function OpenCashForm() {
  const [state, formAction] = useActionState(openCashSessionAction, initialState);

  return (
    <Card className="h-fit">
      <CardHeader
        title="Abrir caixa"
        description="Informe o fundo de troco disponível no início do turno."
      />
      <form action={formAction} className="card-pad space-y-4">
        {state.message ? (
          <Alert tone={state.ok ? "success" : "danger"}>{state.message}</Alert>
        ) : null}

        <div>
          <label className="label" htmlFor="openingAmountCents">
            Fundo de troco (R$)
          </label>
          <input
            id="openingAmountCents"
            name="openingAmountCents"
            inputMode="decimal"
            className="input"
            placeholder="0,00"
            defaultValue="0,00"
          />
          {state.fieldErrors?.openingAmountCents ? (
            <p className="mt-1 text-xs text-red-600">
              {state.fieldErrors.openingAmountCents}
            </p>
          ) : null}
        </div>

        <div>
          <label className="label" htmlFor="opening-notes">
            Observações
          </label>
          <textarea
            id="opening-notes"
            name="notes"
            rows={2}
            className="input"
            placeholder="Turno, responsável, conferência inicial..."
          />
        </div>

        <SubmitButton className="btn btn-primary w-full" pendingLabel="Abrindo...">
          Abrir caixa
        </SubmitButton>
      </form>
    </Card>
  );
}

export function CloseCashForm({ expectedCents }: { expectedCents: number }) {
  const [state, formAction] = useActionState(closeCashSessionAction, initialState);

  return (
    <Card className="h-fit">
      <CardHeader
        title="Encerrar sessão"
        description={`Valor esperado em dinheiro: ${formatBRL(expectedCents)}.`}
      />
      <form action={formAction} className="card-pad space-y-4">
        {state.message ? (
          <Alert tone={state.ok ? "success" : "danger"}>{state.message}</Alert>
        ) : null}

        <div>
          <label className="label" htmlFor="closingAmountCents">
            Valor contado em dinheiro (R$)
          </label>
          <input
            id="closingAmountCents"
            name="closingAmountCents"
            inputMode="decimal"
            required
            className="input"
            placeholder="0,00"
          />
          {state.fieldErrors?.closingAmountCents ? (
            <p className="mt-1 text-xs text-red-600">
              {state.fieldErrors.closingAmountCents}
            </p>
          ) : null}
        </div>

        <div>
          <label className="label" htmlFor="closing-notes">
            Observações do fechamento
          </label>
          <textarea
            id="closing-notes"
            name="notes"
            rows={2}
            className="input"
            placeholder="Diferenças, ocorrências do turno..."
          />
        </div>

        <SubmitButton
          className="btn btn-danger w-full"
          pendingLabel="Encerrando..."
        >
          Encerrar sessão
        </SubmitButton>
      </form>
    </Card>
  );
}

export function CashMovementForm() {
  const [state, formAction] = useActionState(
    registerCashMovementAction,
    initialState,
  );

  return (
    <Card className="h-fit">
      <CardHeader
        title="Movimento de caixa"
        description="Sangrias e suprimentos ficam no histórico da sessão aberta."
      />
      <form action={formAction} className="card-pad space-y-4">
        {state.message ? (
          <Alert tone={state.ok ? "success" : "danger"}>{state.message}</Alert>
        ) : null}

        <div>
          <label className="label" htmlFor="movement-type">
            Tipo
          </label>
          <select
            id="movement-type"
            name="type"
            className="input"
            defaultValue="SANGRIA"
          >
            {Object.entries(MOVEMENT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {state.fieldErrors?.type ? (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.type}</p>
          ) : null}
        </div>

        <div>
          <label className="label" htmlFor="movement-amount">
            Valor (R$)
          </label>
          <input
            id="movement-amount"
            name="amountCents"
            inputMode="decimal"
            required
            className="input"
            placeholder="0,00"
          />
          {state.fieldErrors?.amountCents ? (
            <p className="mt-1 text-xs text-red-600">
              {state.fieldErrors.amountCents}
            </p>
          ) : null}
        </div>

        <div>
          <label className="label" htmlFor="movement-description">
            Descrição
          </label>
          <input
            id="movement-description"
            name="description"
            className="input"
            placeholder="Depósito bancário, troco do turno..."
          />
        </div>

        <SubmitButton className="btn btn-secondary w-full" pendingLabel="Registrando...">
          Registrar movimento
        </SubmitButton>
      </form>
    </Card>
  );
}
