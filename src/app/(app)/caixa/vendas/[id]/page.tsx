import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db";
import { cashSessions, customers, saleItems, sales, users } from "@/db/schema";
import { cancelSaleAction } from "@/app/actions/sales";
import { isAdminRole, requireUser } from "@/lib/auth";
import { formatBRL, formatDateTime } from "@/lib/format";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export const metadata = { title: "Venda" };

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

export default async function VendaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const isAdmin = isAdminRole(user.role);

  const [sale] = await db()
    .select({
      id: sales.id,
      number: sales.number,
      status: sales.status,
      createdAt: sales.createdAt,
      closedAt: sales.closedAt,
      subtotalCents: sales.subtotalCents,
      discountCents: sales.discountCents,
      totalCents: sales.totalCents,
      paymentMethod: sales.paymentMethod,
      notes: sales.notes,
      customerName: customers.name,
      customerPhone: customers.phone,
      sellerName: users.name,
      sessionId: cashSessions.id,
      sessionOpenedAt: cashSessions.openedAt,
    })
    .from(sales)
    .leftJoin(customers, eq(customers.id, sales.customerId))
    .leftJoin(users, eq(users.id, sales.sellerId))
    .leftJoin(cashSessions, eq(cashSessions.id, sales.cashSessionId))
    .where(and(eq(sales.id, id), eq(sales.storeId, user.storeId)))
    .limit(1);

  if (!sale) notFound();

  const items = await db()
    .select({
      id: saleItems.id,
      code: saleItems.code,
      name: saleItems.name,
      quantity: saleItems.quantity,
      unitPriceCents: saleItems.unitPriceCents,
      unitCostCents: saleItems.unitCostCents,
      totalCents: saleItems.totalCents,
    })
    .from(saleItems)
    .where(eq(saleItems.saleId, sale.id))
    .orderBy(asc(saleItems.name));

  return (
    <>
      <Link
        href="/caixa/vendas"
        className="inline-flex items-center gap-2 text-sm font-medium text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft className="size-4" />
        Voltar para vendas
      </Link>

      <PageHeader
        title={`Venda #${sale.number}`}
        description={`Registrada em ${formatDateTime(sale.createdAt)}.`}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={STATUS_TONES[sale.status]}>
              {STATUS_LABELS[sale.status]}
            </Badge>
            {isAdmin && sale.status === "PAGA" ? (
              <form action={cancelSaleAction}>
                <input type="hidden" name="id" value={sale.id} />
                <SubmitButton
                  className="btn btn-danger"
                  pendingLabel="Cancelando..."
                >
                  Cancelar venda
                </SubmitButton>
              </form>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader
            title="Itens da venda"
            description="Valores registrados no momento da venda."
          />
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-ink-200 text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-5 py-3">Produto</th>
                  <th className="px-5 py-3 text-right">Qtd.</th>
                  <th className="px-5 py-3 text-right">Preço</th>
                  <th className="px-5 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-3">
                      <span className="font-medium text-ink-900">
                        {item.name}
                      </span>
                      <span className="block text-xs text-ink-500">
                        {item.code}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">{item.quantity}</td>
                    <td className="px-5 py-3 text-right">
                      {formatBRL(item.unitPriceCents)}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold">
                      {formatBRL(item.totalCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Resumo" />
            <dl className="card-pad space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">Subtotal</dt>
                <dd className="font-medium">{formatBRL(sale.subtotalCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">Desconto</dt>
                <dd className="font-medium text-red-600">
                  -{formatBRL(sale.discountCents)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-ink-200 pt-2 text-base">
                <dt className="font-semibold text-ink-900">Total</dt>
                <dd className="font-bold text-ink-900">
                  {formatBRL(sale.totalCents)}
                </dd>
              </div>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Dados da venda" />
            <dl className="card-pad space-y-3 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Cliente
                </dt>
                <dd className="text-ink-900">
                  {sale.customerName ?? "Consumidor final"}
                  {sale.customerPhone ? (
                    <span className="block text-xs text-ink-500">
                      {sale.customerPhone}
                    </span>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Vendedor
                </dt>
                <dd className="text-ink-900">{sale.sellerName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Pagamento
                </dt>
                <dd className="text-ink-900">
                  {sale.paymentMethod
                    ? PAYMENT_LABELS[sale.paymentMethod]
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Sessão de caixa
                </dt>
                <dd className="text-ink-900">
                  {sale.sessionId
                    ? `Aberta em ${formatDateTime(sale.sessionOpenedAt)}`
                    : "Sem sessão aberta na venda"}
                </dd>
              </div>
              {sale.notes ? (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Observações
                  </dt>
                  <dd className="text-ink-600">{sale.notes}</dd>
                </div>
              ) : null}
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
