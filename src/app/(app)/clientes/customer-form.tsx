"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";
import { deleteCustomerAction, saveCustomerAction } from "@/app/actions/customers";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Card, CardHeader } from "@/components/ui";
import type { ActionState } from "@/lib/validation";

export type CustomerFormValues = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  address: string | null;
  notes: string | null;
};

const initialState: ActionState = { ok: false };

export function CustomerForm({
  customer,
}: {
  customer?: CustomerFormValues | null;
}) {
  const [state, formAction] = useActionState(saveCustomerAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const handledMessage = useRef<string | null>(null);

  useEffect(() => {
    if (!state.ok || !state.message) return;
    if (handledMessage.current === state.message) return;

    handledMessage.current = state.message;
    // Cadastro novo: limpa os campos para o próximo cliente.
    if (!customer) formRef.current?.reset();
  }, [state, customer]);

  return (
    <Card className="h-fit">
      <CardHeader
        title={customer ? "Editar cliente" : "Novo cliente"}
        description={
          customer
            ? "Alterações valem apenas para as próximas vendas; o histórico é preservado."
            : "Vincule vendas a um cliente para acompanhar o histórico de compras."
        }
      />
      <form ref={formRef} action={formAction} className="card-pad space-y-4">
        {state.message ? (
          <Alert tone={state.ok ? "success" : "danger"}>{state.message}</Alert>
        ) : null}

        {customer ? <input type="hidden" name="id" value={customer.id} /> : null}

        <div>
          <label className="label" htmlFor="name">
            Nome
          </label>
          <input
            id="name"
            name="name"
            required
            className="input"
            defaultValue={customer?.name ?? ""}
            placeholder="Nome completo"
          />
          {state.fieldErrors?.name ? (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.name}</p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="phone">
              Telefone / WhatsApp
            </label>
            <input
              id="phone"
              name="phone"
              className="input"
              defaultValue={customer?.phone ?? ""}
              placeholder="(00) 00000-0000"
            />
            {state.fieldErrors?.phone ? (
              <p className="mt-1 text-xs text-red-600">
                {state.fieldErrors.phone}
              </p>
            ) : null}
          </div>

          <div>
            <label className="label" htmlFor="document">
              CPF / CNPJ
            </label>
            <input
              id="document"
              name="document"
              className="input"
              defaultValue={customer?.document ?? ""}
              placeholder="Documento"
            />
            {state.fieldErrors?.document ? (
              <p className="mt-1 text-xs text-red-600">
                {state.fieldErrors.document}
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="input"
            defaultValue={customer?.email ?? ""}
            placeholder="cliente@email.com"
          />
          {state.fieldErrors?.email ? (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.email}</p>
          ) : null}
        </div>

        <div>
          <label className="label" htmlFor="address">
            Endereço
          </label>
          <input
            id="address"
            name="address"
            className="input"
            defaultValue={customer?.address ?? ""}
            placeholder="Rua, número, bairro"
          />
        </div>

        <div>
          <label className="label" htmlFor="notes">
            Observações
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            className="input"
            defaultValue={customer?.notes ?? ""}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <SubmitButton className="btn btn-primary flex-1">
            {customer ? "Salvar alterações" : "Cadastrar cliente"}
          </SubmitButton>
          {customer ? (
            <Link href="/clientes" className="btn btn-secondary">
              Cancelar
            </Link>
          ) : null}
        </div>
      </form>
    </Card>
  );
}

export function DeleteCustomerButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  return (
    <form action={deleteCustomerAction}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="btn btn-ghost px-2 py-1.5 text-red-600 hover:bg-red-50"
        aria-label={`Excluir ${name}`}
        title={`Excluir ${name}`}
      >
        <Trash2 className="size-4" />
      </button>
    </form>
  );
}
