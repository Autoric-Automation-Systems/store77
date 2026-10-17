"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cancelSaleAction } from "@/app/actions/sales";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui";
import { formatBRL, formatDateTime, formatDateTimeShort } from "@/lib/format";
import type { Sale } from "@/db/schema";

export type SaleItemRow = {
  id: string;
  code: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
};

export type SaleRow = {
  id: string;
  number: number;
  createdAt: Date;
  status: Sale["status"];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  paymentMethod: Sale["paymentMethod"];
  customerName: string | null;
  sellerName: string | null;
  items: SaleItemRow[];
};

const STATUS_LABELS = {
  ABERTA: "Aberta",
  PAGA: "Paga",
  CANCELADA: "Cancelada",
} as const;

const STATUS_TONES = {
  ABERTA: "info",
  PAGA: "success",
  CANCELADA: "danger",
} as const;

const PAYMENT_LABELS = {
  DINHEIRO: "Dinheiro",
  PIX: "Pix",
  DEBITO: "Débito",
  CREDITO: "Crédito",
  OUTRO: "Outro",
} as const;

export function SalesTable({
  rows,
  isAdmin,
}: {
  rows: SaleRow[];
  isAdmin: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-ink-200 text-sm">
        <thead className="table-head">
          <tr>
            <th className="px-3 py-3 sm:px-5">Venda</th>
            <th className="hidden px-3 py-3 lg:table-cell lg:px-5">Cliente</th>
            <th className="hidden px-3 py-3 lg:table-cell lg:px-5">Vendedor</th>
            <th className="px-3 py-3 text-right sm:px-5">Total</th>
            <th className="hidden px-3 py-3 lg:table-cell lg:px-5">
              Pagamento
            </th>
            <th className="hidden px-3 py-3 sm:table-cell sm:px-5">Status</th>
            <th className="px-3 py-3 text-right sm:px-5">Itens</th>
            <th className="px-3 py-3 sm:px-5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {rows.map((sale) => {
            const expanded = openId === sale.id;
            const itemsId = `itens-venda-${sale.id}`;

            return (
              <Fragment key={sale.id}>
                <tr className="hover:bg-ink-50">
                  <td className="whitespace-nowrap px-3 py-3 sm:px-5">
                    <Link
                      href={`/caixa/vendas/${sale.id}`}
                      className="font-semibold text-brand-700 hover:underline"
                    >
                      #{sale.number}
                    </Link>
                    <span className="block text-xs text-ink-500">
                      <span className="sm:hidden">
                        {formatDateTimeShort(sale.createdAt)}
                      </span>
                      <span className="hidden sm:inline">
                        {formatDateTime(sale.createdAt)}
                      </span>
                    </span>
                  </td>
                  <td className="hidden px-3 py-3 text-ink-700 lg:table-cell lg:px-5">
                    {sale.customerName ?? "Consumidor final"}
                  </td>
                  <td className="hidden px-3 py-3 text-ink-500 lg:table-cell lg:px-5">
                    {sale.sellerName ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-semibold sm:px-5">
                    {formatBRL(sale.totalCents)}
                  </td>
                  <td className="hidden px-3 py-3 text-ink-500 lg:table-cell lg:px-5">
                    {sale.paymentMethod
                      ? PAYMENT_LABELS[sale.paymentMethod]
                      : "—"}
                  </td>
                  <td className="hidden px-3 py-3 sm:table-cell sm:px-5">
                    <Badge tone={STATUS_TONES[sale.status]}>
                      {STATUS_LABELS[sale.status]}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right sm:px-5">
                    <button
                      type="button"
                      onClick={() => setOpenId(expanded ? null : sale.id)}
                      aria-expanded={expanded}
                      aria-controls={itemsId}
                      aria-label={`Ver produtos da venda #${sale.number}`}
                      className="btn btn-secondary px-3 py-1.5 text-xs"
                    >
                      {sale.items.length}
                      <ChevronDown
                        className={`size-4 transition-transform ${
                          expanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right sm:px-5">
                    {isAdmin && sale.status === "PAGA" ? (
                      <form action={cancelSaleAction}>
                        <input type="hidden" name="id" value={sale.id} />
                        <SubmitButton
                          className="btn btn-danger px-3 py-1.5 text-xs"
                          pendingLabel="Cancelando..."
                        >
                          Cancelar venda
                        </SubmitButton>
                      </form>
                    ) : null}
                  </td>
                </tr>

                {expanded ? (
                  <tr id={itemsId} className="bg-ink-50/60">
                    <td colSpan={8} className="px-3 pb-4 sm:px-5">
                      {sale.items.length === 0 ? (
                        <p className="text-sm text-ink-500">
                          Nenhum item registrado nesta venda.
                        </p>
                      ) : (
                        <ul className="divide-y divide-ink-200 rounded-xl border border-ink-200 bg-white">
                          {sale.items.map((item) => (
                            <li
                              key={item.id}
                              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-2 sm:px-4"
                            >
                              <div className="min-w-0">
                                <p className="font-medium text-ink-900">
                                  {item.name}
                                </p>
                                <p className="text-xs text-ink-500">
                                  {item.code}
                                </p>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-xs text-ink-500">
                                  {item.quantity} ×{" "}
                                  {formatBRL(item.unitPriceCents)}
                                </span>
                                <span className="w-24 text-right font-semibold text-ink-900">
                                  {formatBRL(item.totalCents)}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-500">
                        <span>
                          Subtotal {formatBRL(sale.subtotalCents)}
                          {sale.discountCents > 0
                            ? ` · Desconto -${formatBRL(sale.discountCents)}`
                            : ""}
                          {" · "}
                          <span className="font-semibold text-ink-900">
                            Total {formatBRL(sale.totalCents)}
                          </span>
                        </span>
                        <Link
                          href={`/caixa/vendas/${sale.id}`}
                          className="font-medium text-brand-700 hover:underline"
                        >
                          Abrir venda #{sale.number}
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
