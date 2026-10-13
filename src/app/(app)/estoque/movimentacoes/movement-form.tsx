"use client";

import { useActionState, useState } from "react";
import { createStockMovementAction } from "@/app/actions/products";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Card, CardHeader } from "@/components/ui";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = { ok: false };

export type MovementProduct = {
  id: string;
  code: string;
  name: string;
  unit: string;
  quantity: number;
};

const LABELS = {
  ENTRADA: "Entrada",
  SAIDA: "Saída",
  AJUSTE: "Ajuste (define o saldo)",
} as const;

export function MovementForm({
  products,
  defaultProductId,
}: {
  products: MovementProduct[];
  defaultProductId?: string;
}) {
  const [state, formAction] = useActionState(createStockMovementAction, initialState);
  const [productId, setProductId] = useState(defaultProductId ?? "");
  const [type, setType] = useState<"ENTRADA" | "SAIDA" | "AJUSTE">("ENTRADA");
  const [quantity, setQuantity] = useState("1");

  const selected = products.find((product) => product.id === productId);
  const amount = Number.parseInt(quantity, 10) || 0;
  const preview = selected
    ? type === "ENTRADA"
      ? selected.quantity + amount
      : type === "SAIDA"
        ? selected.quantity - amount
        : amount
    : null;

  return (
    <Card className="h-fit">
      <CardHeader
        title="Registrar movimentação"
        description="Toda alteração de saldo fica registrada no histórico."
      />
      <form action={formAction} className="card-pad space-y-4">
        {state.message ? (
          <Alert tone={state.ok ? "success" : "danger"}>{state.message}</Alert>
        ) : null}

        <div>
          <label className="label" htmlFor="productId">
            Produto
          </label>
          <select
            id="productId"
            name="productId"
            required
            className="input"
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
          >
            <option value="">Selecione...</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.code} · {product.name} ({product.quantity} {product.unit})
              </option>
            ))}
          </select>
          {state.fieldErrors?.productId ? (
            <p className="mt-1 text-xs text-red-600">
              {state.fieldErrors.productId}
            </p>
          ) : null}
        </div>

        <div>
          <label className="label" htmlFor="type">
            Tipo
          </label>
          <select
            id="type"
            name="type"
            className="input"
            value={type}
            onChange={(event) =>
              setType(event.target.value as "ENTRADA" | "SAIDA" | "AJUSTE")
            }
          >
            {Object.entries(LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="quantity">
            {type === "AJUSTE" ? "Novo saldo" : "Quantidade"}
          </label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            min={type === "AJUSTE" ? 0 : 1}
            step={1}
            required
            className="input"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
          {preview !== null ? (
            <p className="mt-1 text-xs text-ink-500">
              Saldo após o lançamento:{" "}
              <strong className={preview < 0 ? "text-red-600" : "text-ink-900"}>
                {preview} {selected?.unit}
              </strong>
            </p>
          ) : null}
          {state.fieldErrors?.quantity ? (
            <p className="mt-1 text-xs text-red-600">
              {state.fieldErrors.quantity}
            </p>
          ) : null}
        </div>

        {type === "ENTRADA" ? (
          <div>
            <label className="label" htmlFor="unitCostCents">
              Custo unitário (R$)
            </label>
            <input
              id="unitCostCents"
              name="unitCostCents"
              inputMode="decimal"
              className="input"
              placeholder="0,00"
            />
          </div>
        ) : null}

        <div>
          <label className="label" htmlFor="reason">
            Motivo
          </label>
          <input
            id="reason"
            name="reason"
            className="input"
            placeholder="Compra do fornecedor, perda, inventário..."
          />
        </div>

        <SubmitButton className="btn btn-primary w-full">
          Registrar movimentação
        </SubmitButton>
      </form>
    </Card>
  );
}
