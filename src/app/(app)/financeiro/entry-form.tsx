"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { saveFinancialEntryAction } from "@/app/actions/finance";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Card, CardHeader, Field } from "@/components/ui";
import { centsToInput, todayISO } from "@/lib/format";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = { ok: false };

const CATEGORY_SUGGESTIONS = [
  "Fornecedores",
  "Aluguel",
  "Energia",
  "Impostos",
  "Marketing",
  "Manutenção",
  "Outros",
];

const PAYMENT_METHODS = [
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "PIX", label: "Pix" },
  { value: "DEBITO", label: "Débito" },
  { value: "CREDITO", label: "Crédito" },
  { value: "OUTRO", label: "Outro" },
] as const;

type PaymentMethodValue = (typeof PAYMENT_METHODS)[number]["value"];

export type EntryFormValues = {
  id?: string;
  kind: "RECEBER" | "PAGAR";
  description: string;
  category: string | null;
  amountCents: number;
  dueDate: string;
  paymentMethod: PaymentMethodValue | null;
  notes: string | null;
};

export function EntryForm({
  entry,
  cancelHref = "/financeiro",
}: {
  entry?: EntryFormValues;
  cancelHref?: string;
}) {
  const [state, formAction] = useActionState(
    saveFinancialEntryAction,
    initialState,
  );
  const isEdit = Boolean(entry?.id);

  const [kind, setKind] = useState<"RECEBER" | "PAGAR">(entry?.kind ?? "RECEBER");
  const [description, setDescription] = useState(entry?.description ?? "");
  const [category, setCategory] = useState(entry?.category ?? "");
  const [amount, setAmount] = useState(entry ? centsToInput(entry.amountCents) : "");
  const [dueDate, setDueDate] = useState(entry?.dueDate ?? todayISO());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodValue | "">(
    entry?.paymentMethod ?? "",
  );
  const [notes, setNotes] = useState(entry?.notes ?? "");

  // Depois de criar, o formulário volta ao estado inicial — ao editar, os
  // valores permanecem para permitir ajustes seguidos.
  useEffect(() => {
    if (isEdit || !state.ok) return;
    setKind("RECEBER");
    setDescription("");
    setCategory("");
    setAmount("");
    setDueDate(todayISO());
    setPaymentMethod("");
    setNotes("");
  }, [state, isEdit]);

  return (
    <Card className="h-fit">
      <CardHeader
        title={isEdit ? "Editar lançamento" : "Novo lançamento"}
        description="Contas a pagar e a receber manuais. As vendas do Caixa entram nos resumos automaticamente."
      />
      <form action={formAction} className="card-pad space-y-4">
        {entry?.id ? <input type="hidden" name="id" value={entry.id} /> : null}

        {state.message ? (
          <Alert tone={state.ok ? "success" : "danger"}>{state.message}</Alert>
        ) : null}

        <Field label="Tipo" name="kind" error={state.fieldErrors?.kind}>
          <select
            id="kind"
            name="kind"
            className="input"
            value={kind}
            onChange={(event) =>
              setKind(event.target.value as "RECEBER" | "PAGAR")
            }
          >
            <option value="RECEBER">A receber</option>
            <option value="PAGAR">A pagar</option>
          </select>
        </Field>

        <Field
          label="Descrição"
          name="description"
          error={state.fieldErrors?.description}
        >
          <input
            id="description"
            name="description"
            required
            className="input"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Aluguel da loja, fornecedor, crediário..."
          />
        </Field>

        <Field
          label="Categoria"
          name="category"
          error={state.fieldErrors?.category}
          hint="Texto livre, com sugestões prontas."
        >
          <input
            id="category"
            name="category"
            list="financial-categories"
            className="input"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="Fornecedores"
          />
          <datalist id="financial-categories">
            {CATEGORY_SUGGESTIONS.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Valor (R$)"
            name="amountCents"
            error={state.fieldErrors?.amountCents}
          >
            <input
              id="amountCents"
              name="amountCents"
              inputMode="decimal"
              required
              className="input"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0,00"
            />
          </Field>

          <Field
            label="Vencimento"
            name="dueDate"
            error={state.fieldErrors?.dueDate}
          >
            <input
              id="dueDate"
              name="dueDate"
              type="date"
              required
              className="input"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </Field>
        </div>

        <Field
          label="Forma de pagamento"
          name="paymentMethod"
          error={state.fieldErrors?.paymentMethod}
          hint="Opcional."
        >
          <select
            id="paymentMethod"
            name="paymentMethod"
            className="input"
            value={paymentMethod}
            onChange={(event) =>
              setPaymentMethod(event.target.value as PaymentMethodValue | "")
            }
          >
            <option value="">Não informar</option>
            {PAYMENT_METHODS.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Observações" name="notes" error={state.fieldErrors?.notes}>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            className="input"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>

        <div className="flex flex-wrap gap-3">
          <SubmitButton className="btn btn-primary flex-1">
            {isEdit ? "Salvar alterações" : "Criar lançamento"}
          </SubmitButton>
          {isEdit ? (
            <Link href={cancelHref} className="btn btn-secondary">
              Cancelar
            </Link>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
