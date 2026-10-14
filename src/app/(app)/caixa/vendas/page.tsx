import Link from "next/link";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { customers, saleItems, sales, users } from "@/db/schema";
import { cancelSaleAction } from "@/app/actions/sales";
import { isAdminRole, requireUser } from "@/lib/auth";
import { formatBRL, formatDateTime, formatDateTimeShort } from "@/lib/format";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export const metadata = { title: "Vendas" };

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

export default async function VendasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireUser();
  const { status = "" } = await searchParams;
  const isAdmin = isAdminRole(user.role);

  const filters: SQL[] = [eq(sales.storeId, user.storeId)];
  if (status === "ABERTA" || status === "PAGA" || status === "CANCELADA") {
    filters.push(eq(sales.status, status));
  }

  const rows = await db()
    .select({
      id: sales.id,
      number: sales.number,
      createdAt: sales.createdAt,
      status: sales.status,
      totalCents: sales.totalCents,
      paymentMethod: sales.paymentMethod,
      customerName: customers.name,
      sellerName: users.name,
      itemCount: sql<number>`(select count(*) from ${saleItems} where ${saleItems.saleId} = ${sales.id})::int`,
    })
    .from(sales)
    .leftJoin(customers, eq(customers.id, sales.customerId))
    .leftJoin(users, eq(users.id, sales.sellerId))
    .where(and(...filters))
    .orderBy(desc(sales.createdAt))
    .limit(100);

  return (
    <>
      <PageHeader
        title="Vendas"
        description="Últimas 100 vendas da loja, com itens, pagamento e situação."
        action={
          <Link href="/caixa" className="btn btn-primary">
            Abrir PDV
          </Link>
        }
      />

      <Card>
        <CardHeader
          title="Histórico de vendas"
          action={
            <form className="flex gap-2">
              <select
                name="status"
                defaultValue={status}
                className="input py-2 text-xs"
              >
                <option value="">Todos os status</option>
                <option value="PAGA">Pagas</option>
                <option value="ABERTA">Abertas</option>
                <option value="CANCELADA">Canceladas</option>
              </select>
              <button type="submit" className="btn btn-secondary px-3 py-2 text-xs">
                Filtrar
              </button>
            </form>
          }
        />

        {rows.length === 0 ? (
          <EmptyState
            title="Nenhuma venda encontrada"
            description="Finalize uma venda no PDV para vê-la aqui."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-ink-200 text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-3 py-3 sm:px-5">Venda</th>
                  <th className="hidden px-3 py-3 lg:table-cell lg:px-5">Cliente</th>
                  <th className="hidden px-3 py-3 lg:table-cell lg:px-5">Vendedor</th>
                  <th className="hidden px-3 py-3 text-right lg:table-cell lg:px-5">
                    Itens
                  </th>
                  <th className="px-3 py-3 text-right sm:px-5">Total</th>
                  <th className="hidden px-3 py-3 lg:table-cell lg:px-5">
                    Pagamento
                  </th>
                  <th className="hidden px-3 py-3 sm:table-cell sm:px-5">Status</th>
                  <th className="px-3 py-3 sm:px-5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rows.map((sale) => (
                  <tr key={sale.id} className="hover:bg-ink-50">
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
                    <td className="hidden px-3 py-3 text-right text-ink-600 lg:table-cell lg:px-5">
                      {sale.itemCount}
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
                    <td className="whitespace-nowrap px-3 py-3 sm:px-5 text-right">
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
