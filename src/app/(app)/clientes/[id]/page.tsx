import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, sql } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db";
import { customers, saleItems, sales } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import {
  formatBRL,
  formatDate,
  formatDateTime,
  formatDateTimeShort,
} from "@/lib/format";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Stat,
} from "@/components/ui";

export const metadata = { title: "Cliente" };

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

export default async function ClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const [customer] = await db()
    .select({
      id: customers.id,
      name: customers.name,
      email: customers.email,
      phone: customers.phone,
      document: customers.document,
      address: customers.address,
      notes: customers.notes,
      createdAt: customers.createdAt,
    })
    .from(customers)
    .where(and(eq(customers.id, id), eq(customers.storeId, user.storeId)))
    .limit(1);

  if (!customer) notFound();

  const [totals, purchases] = await Promise.all([
    // Só venda paga conta como compra: aberta é carrinho do PDV e cancelada
    // devolve o estoque e estorna o caixa.
    db()
      .select({
        purchaseCount: sql<number>`count(*)::int`,
        totalSpentCents: sql<number>`coalesce(sum(${sales.totalCents}), 0)::int`,
      })
      .from(sales)
      .where(
        and(
          eq(sales.customerId, customer.id),
          eq(sales.storeId, user.storeId),
          eq(sales.status, "PAGA"),
        ),
      ),

    // O JOIN é o que permite contar os itens: numa consulta de uma única tabela
    // o Drizzle monta os `sql` sem qualificar as colunas e a correlação viraria
    // `"sale_id" = "id"`, comparando o item com ele mesmo.
    db()
      .select({
        id: sales.id,
        number: sales.number,
        status: sales.status,
        createdAt: sales.createdAt,
        totalCents: sales.totalCents,
        paymentMethod: sales.paymentMethod,
        itemCount: sql<number>`count(${saleItems.id})::int`,
      })
      .from(sales)
      .leftJoin(saleItems, eq(saleItems.saleId, sales.id))
      .where(
        and(eq(sales.customerId, customer.id), eq(sales.storeId, user.storeId)),
      )
      .groupBy(
        sales.id,
        sales.number,
        sales.status,
        sales.createdAt,
        sales.totalCents,
        sales.paymentMethod,
      )
      .orderBy(desc(sales.createdAt))
      .limit(100),
  ]);

  const { purchaseCount, totalSpentCents } = totals[0] ?? {
    purchaseCount: 0,
    totalSpentCents: 0,
  };
  const averageTicketCents =
    purchaseCount > 0 ? Math.round(totalSpentCents / purchaseCount) : 0;
  // A lista vem da mais recente para a mais antiga, então a primeira paga é a
  // última compra — sem precisar de outra consulta.
  const lastPurchaseAt =
    purchases.find((purchase) => purchase.status === "PAGA")?.createdAt ?? null;

  const contacts = [customer.phone, customer.document, customer.email].filter(
    Boolean,
  );

  return (
    <>
      <Link
        href="/clientes"
        className="inline-flex items-center gap-2 text-sm font-medium text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft className="size-4" />
        Voltar para clientes
      </Link>

      <PageHeader
        title={customer.name}
        description={contacts.join(" · ") || "Sem contato cadastrado"}
        action={
          <Link
            href={`/clientes?editar=${customer.id}`}
            className="btn btn-secondary"
          >
            Editar cadastro
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Compras pagas"
          value={String(purchaseCount)}
          hint={purchaseCount === 1 ? "1 venda" : `${purchaseCount} vendas`}
          tone={purchaseCount > 0 ? "success" : "neutral"}
        />
        <Stat label="Total gasto" value={formatBRL(totalSpentCents)} />
        <Stat label="Ticket médio" value={formatBRL(averageTicketCents)} />
        <Stat
          label="Última compra"
          value={lastPurchaseAt ? formatDate(lastPurchaseAt) : "—"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader
            title="Compras realizadas"
            description="Últimas 100 vendas vinculadas a este cliente. Vendas abertas e canceladas aparecem na lista, mas não entram no total gasto."
          />

          {purchases.length === 0 ? (
            <EmptyState
              title="Nenhuma compra registrada"
              description="Escolha este cliente no PDV para vincular uma venda ao histórico dele."
              action={
                <Link href="/caixa" className="btn btn-primary">
                  Abrir PDV
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-ink-200 text-sm">
                <thead className="table-head">
                  <tr>
                    <th className="px-3 py-3 sm:px-5">Venda</th>
                    <th className="hidden px-3 py-3 text-right lg:table-cell lg:px-5">
                      Itens
                    </th>
                    <th className="px-3 py-3 text-right sm:px-5">Total</th>
                    <th className="hidden px-3 py-3 lg:table-cell lg:px-5">
                      Pagamento
                    </th>
                    <th className="hidden px-3 py-3 sm:table-cell sm:px-5">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {purchases.map((purchase) => (
                    <tr key={purchase.id} className="hover:bg-ink-50">
                      <td className="whitespace-nowrap px-3 py-3 sm:px-5">
                        <Link
                          href={`/caixa/vendas/${purchase.id}`}
                          className="font-semibold text-brand-700 hover:underline"
                        >
                          #{purchase.number}
                        </Link>
                        <span className="block text-xs text-ink-500">
                          <span className="sm:hidden">
                            {formatDateTimeShort(purchase.createdAt)}
                          </span>
                          <span className="hidden sm:inline">
                            {formatDateTime(purchase.createdAt)}
                          </span>
                        </span>
                      </td>
                      <td className="hidden px-3 py-3 text-right text-ink-600 lg:table-cell lg:px-5">
                        {purchase.itemCount}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-semibold sm:px-5">
                        {formatBRL(purchase.totalCents)}
                      </td>
                      <td className="hidden px-3 py-3 text-ink-500 lg:table-cell lg:px-5">
                        {purchase.paymentMethod
                          ? PAYMENT_LABELS[purchase.paymentMethod]
                          : "—"}
                      </td>
                      <td className="hidden px-3 py-3 sm:table-cell sm:px-5">
                        <Badge tone={STATUS_TONES[purchase.status]}>
                          {STATUS_LABELS[purchase.status]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="h-fit">
          <CardHeader title="Dados do cliente" />
          <dl className="card-pad space-y-3 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Telefone / WhatsApp
              </dt>
              <dd className="text-ink-700">{customer.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                CPF / CNPJ
              </dt>
              <dd className="text-ink-700">{customer.document ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                E-mail
              </dt>
              <dd className="text-ink-700">{customer.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Endereço
              </dt>
              <dd className="text-ink-700">{customer.address ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Observações
              </dt>
              <dd className="whitespace-pre-line text-ink-700">
                {customer.notes ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Cliente desde
              </dt>
              <dd className="text-ink-700">{formatDate(customer.createdAt)}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </>
  );
}
