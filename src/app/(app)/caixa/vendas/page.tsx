import Link from "next/link";
import { and, asc, desc, eq, inArray, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { customers, saleItems, sales, users } from "@/db/schema";
import { isAdminRole, requireUser } from "@/lib/auth";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { SalesTable, type SaleItemRow, type SaleRow } from "./sales-table";

export const metadata = { title: "Vendas" };

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
      subtotalCents: sales.subtotalCents,
      discountCents: sales.discountCents,
      totalCents: sales.totalCents,
      paymentMethod: sales.paymentMethod,
      customerName: customers.name,
      sellerName: users.name,
    })
    .from(sales)
    .leftJoin(customers, eq(customers.id, sales.customerId))
    .leftJoin(users, eq(users.id, sales.sellerId))
    .where(and(...filters))
    .orderBy(desc(sales.createdAt))
    .limit(100);

  // Os itens das vendas listadas vêm em uma segunda consulta: assim qualquer
  // venda abre os produtos na própria lista, sem uma ida ao banco por clique.
  const items = rows.length
    ? await db()
        .select({
          id: saleItems.id,
          saleId: saleItems.saleId,
          code: saleItems.code,
          name: saleItems.name,
          quantity: saleItems.quantity,
          unitPriceCents: saleItems.unitPriceCents,
          totalCents: saleItems.totalCents,
        })
        .from(saleItems)
        .where(
          inArray(
            saleItems.saleId,
            rows.map((row) => row.id),
          ),
        )
        .orderBy(asc(saleItems.name))
    : [];

  const itemsBySale = new Map<string, SaleItemRow[]>();
  for (const item of items) {
    const list = itemsBySale.get(item.saleId) ?? [];
    list.push({
      id: item.id,
      code: item.code,
      name: item.name,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      totalCents: item.totalCents,
    });
    itemsBySale.set(item.saleId, list);
  }

  const saleRows: SaleRow[] = rows.map((row) => ({
    ...row,
    items: itemsBySale.get(row.id) ?? [],
  }));

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
          description="Abra os itens para ver os produtos de cada venda sem sair da lista."
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

        {saleRows.length === 0 ? (
          <EmptyState
            title="Nenhuma venda encontrada"
            description="Finalize uma venda no PDV para vê-la aqui."
          />
        ) : (
          <SalesTable rows={saleRows} isAdmin={isAdmin} />
        )}
      </Card>
    </>
  );
}
