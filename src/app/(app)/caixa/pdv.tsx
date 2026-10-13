"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import { finalizeSaleAction } from "@/app/actions/sales";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Card, CardHeader, EmptyState } from "@/components/ui";
import { formatBRL, parseMoneyToCents } from "@/lib/format";
import type { ActionState } from "@/lib/validation";

export type PdvProduct = {
  id: string;
  code: string;
  name: string;
  unit: string;
  priceCents: number;
  quantity: number;
  categoryId: string | null;
  categoryName: string | null;
};

export type PdvCategory = { id: string; name: string };
export type PdvCustomer = { id: string; name: string };

const PAYMENT_LABELS = {
  DINHEIRO: "Dinheiro",
  PIX: "Pix",
  DEBITO: "Débito",
  CREDITO: "Crédito",
  OUTRO: "Outro",
} as const;

type PaymentMethod = keyof typeof PAYMENT_LABELS;

type CartLine = { productId: string; quantity: number };

const initialState: ActionState = { ok: false };

export function Pdv({
  products,
  categories,
  customers,
}: {
  products: PdvProduct[];
  categories: PdvCategory[];
  customers: PdvCustomer[];
}) {
  const [state, formAction] = useActionState(finalizeSaleAction, initialState);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("DINHEIRO");
  const [discount, setDiscount] = useState("");
  const [notes, setNotes] = useState("");
  // Evita limpar o carrinho duas vezes para o mesmo resultado da action.
  const handledMessage = useRef<string | null>(null);

  const byId = useMemo(
    () => new Map(products.map((product) => [product.id, product] as const)),
    [products],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return products.filter((product) => {
      if (categoryId && product.categoryId !== categoryId) return false;
      if (!term) return true;
      return (
        product.name.toLowerCase().includes(term) ||
        product.code.toLowerCase().includes(term)
      );
    });
  }, [products, query, categoryId]);

  const subtotalCents = cart.reduce((sum, line) => {
    const product = byId.get(line.productId);
    return product ? sum + product.priceCents * line.quantity : sum;
  }, 0);
  const discountCents = Math.min(
    Math.max(parseMoneyToCents(discount), 0),
    subtotalCents,
  );
  const totalCents = subtotalCents - discountCents;

  useEffect(() => {
    if (!state.ok || !state.message) return;
    if (handledMessage.current === state.message) return;

    handledMessage.current = state.message;
    setCart([]);
    setDiscount("");
    setNotes("");
    setCustomerId("");
  }, [state]);

  function quantityInCart(productId: string): number {
    return cart.find((line) => line.productId === productId)?.quantity ?? 0;
  }

  function addProduct(product: PdvProduct) {
    setCart((current) => {
      const line = current.find((item) => item.productId === product.id);
      if (!line) return [...current, { productId: product.id, quantity: 1 }];
      if (line.quantity >= product.quantity) return current;

      return current.map((item) =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      );
    });
  }

  function changeQuantity(productId: string, delta: number) {
    setCart((current) =>
      current.flatMap((line) => {
        if (line.productId !== productId) return [line];

        const available = byId.get(productId)?.quantity ?? 0;
        const next = line.quantity + delta;
        if (next < 1) return [];
        if (next > available) return [line];

        return [{ ...line, quantity: next }];
      }),
    );
  }

  function removeLine(productId: string) {
    setCart((current) => current.filter((line) => line.productId !== productId));
  }

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <input type="hidden" name="items" value={JSON.stringify(cart)} />

      <Card className="h-fit">
        <CardHeader
          title="Produtos"
          description="Busque por nome ou código e selecione os itens da venda."
        />
        <div className="card-pad space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
            <input
              type="search"
              className="input pl-9"
              placeholder="Buscar por nome ou código..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              // Enter na busca não pode disparar o envio da venda.
              onKeyDown={(event) => {
                if (event.key === "Enter") event.preventDefault();
              }}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategoryId("")}
              className={`badge ${
                categoryId === ""
                  ? "bg-brand-600 text-white"
                  : "bg-ink-100 text-ink-700"
              }`}
            >
              Todas
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setCategoryId(category.id)}
                className={`badge ${
                  categoryId === category.id
                    ? "bg-brand-600 text-white"
                    : "bg-ink-100 text-ink-700"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title="Nenhum produto disponível"
              description="Ajuste a busca, o filtro de categoria ou cadastre estoque."
            />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {filtered.map((product) => {
                const inCart = quantityInCart(product.id);
                const soldOut = inCart >= product.quantity;

                return (
                  <li key={product.id}>
                    <button
                      type="button"
                      disabled={soldOut}
                      onClick={() => addProduct(product)}
                      className="w-full rounded-xl border border-ink-200 p-3 text-left transition hover:border-brand-300 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="block text-sm font-semibold text-ink-900">
                        {product.name}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-500">
                        {product.code} · {product.quantity} {product.unit} em
                        estoque
                        {product.categoryName ? ` · ${product.categoryName}` : ""}
                      </span>
                      <span className="mt-1 block text-sm font-bold text-brand-700">
                        {formatBRL(product.priceCents)}
                      </span>
                      {inCart > 0 ? (
                        <span className="mt-1 block text-xs font-semibold text-ink-600">
                          {inCart} no carrinho
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>

      <Card className="h-fit">
        <CardHeader
          title="Carrinho"
          description="Confira as quantidades e finalize a venda."
        />
        <div className="card-pad space-y-4">
          {state.message ? (
            <Alert tone={state.ok ? "success" : "danger"}>{state.message}</Alert>
          ) : null}

          {cart.length === 0 ? (
            <p className="text-sm text-ink-500">
              Carrinho vazio. Selecione produtos ao lado.
            </p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {cart.map((line) => {
                const product = byId.get(line.productId);
                if (!product) return null;

                return (
                  <li
                    key={line.productId}
                    className="flex items-center gap-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">
                        {product.name}
                      </p>
                      <p className="text-xs text-ink-500">
                        {formatBRL(product.priceCents)} × {line.quantity} ={" "}
                        {formatBRL(product.priceCents * line.quantity)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => changeQuantity(line.productId, -1)}
                        className="btn btn-secondary px-2 py-1"
                        aria-label={`Diminuir ${product.name}`}
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        disabled={line.quantity >= product.quantity}
                        onClick={() => changeQuantity(line.productId, 1)}
                        className="btn btn-secondary px-2 py-1"
                        aria-label={`Aumentar ${product.name}`}
                      >
                        <Plus className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeLine(line.productId)}
                        className="btn btn-ghost px-2 py-1 text-red-600 hover:bg-red-50"
                        aria-label={`Remover ${product.name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div>
            <label className="label" htmlFor="customerId">
              Cliente
            </label>
            <select
              id="customerId"
              name="customerId"
              className="input"
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
            >
              <option value="">Consumidor final</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="paymentMethod">
                Pagamento
              </label>
              <select
                id="paymentMethod"
                name="paymentMethod"
                className="input"
                value={paymentMethod}
                onChange={(event) =>
                  setPaymentMethod(event.target.value as PaymentMethod)
                }
              >
                {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="discountCents">
                Desconto (R$)
              </label>
              <input
                id="discountCents"
                name="discountCents"
                inputMode="decimal"
                className="input"
                placeholder="0,00"
                value={discount}
                onChange={(event) => setDiscount(event.target.value)}
              />
            </div>
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
              placeholder="Anotações da venda (opcional)"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          <dl className="space-y-1 border-t border-ink-200 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">Subtotal</dt>
              <dd className="font-medium">{formatBRL(subtotalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Desconto</dt>
              <dd className="font-medium text-red-600">
                -{formatBRL(discountCents)}
              </dd>
            </div>
            <div className="flex justify-between text-base">
              <dt className="font-semibold text-ink-900">Total</dt>
              <dd className="font-bold text-ink-900">{formatBRL(totalCents)}</dd>
            </div>
          </dl>

          {state.fieldErrors?.items ? (
            <p className="text-xs text-red-600">{state.fieldErrors.items}</p>
          ) : null}

          <SubmitButton
            className="btn btn-primary w-full"
            disabled={cart.length === 0}
            pendingLabel="Finalizando..."
          >
            <ShoppingCart className="size-4" />
            Finalizar venda
          </SubmitButton>

          {cart.length === 0 ? (
            <p className="text-center text-xs text-ink-500">
              Adicione ao menos um item para finalizar a venda.
            </p>
          ) : null}
        </div>
      </Card>
    </form>
  );
}
