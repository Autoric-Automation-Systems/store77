import Link from "next/link";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { AlertTriangle, ArrowRight, Package, ShoppingCart } from "lucide-react";
import { db } from "@/db";
import {
  cashSessions,
  customers,
  products,
  sales,
  stockMovements,
} from "@/db/schema";
import { isAdminRole, requireUser } from "@/lib/auth";
import { formatBRL, formatDateTime } from "@/lib/format";
import { Badge, Card, CardHeader, EmptyState, PageHeader, Stat } from "@/components/ui";

export const metadata = { title: "Painel" };

export default async function DashboardPage() {
  const user = await requireUser();
  const storeId = user.storeId;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [stockSummary, lowStock, todaySales, recentMovements, openCash, customerCount] =
    await Promise.all([
      db()
        .select({
          active: sql<number>`count(*) filter (where ${products.active})::int`,
          units: sql<number>`coalesce(sum(${products.quantity}), 0)::int`,
          saleValue: sql<number>`coalesce(sum(${products.quantity} * ${products.priceCents}), 0)::bigint`,
          costValue: sql<number>`coalesce(sum(${products.quantity} * ${products.costCents}), 0)::bigint`,
        })
        .from(products)
        .where(eq(products.storeId, storeId)),

      db()
        .select({
          id: products.id,
          code: products.code,
          name: products.name,
          quantity: products.quantity,
          minQuantity: products.minQuantity,
          unit: products.unit,
        })
        .from(products)
        .where(
          and(
            eq(products.storeId, storeId),
            eq(products.active, true),
            sql`${products.quantity} <= ${products.minQuantity}`,
          ),
        )
        .orderBy(products.quantity)
        .limit(8),

      db()
        .select({
          count: sql<number>`count(*)::int`,
          total: sql<number>`coalesce(sum(${sales.totalCents}), 0)::int`,
        })
        .from(sales)
        .where(
          and(
            eq(sales.storeId, storeId),
            eq(sales.status, "PAGA"),
            gte(sales.createdAt, startOfToday),
          ),
        ),

      db()
        .select({
          id: stockMovements.id,
          type: stockMovements.type,
          quantity: stockMovements.quantity,
          balanceAfter: stockMovements.balanceAfter,
          createdAt: stockMovements.createdAt,
          reason: stockMovements.reason,
          productName: products.name,
        })
        .from(stockMovements)
        .innerJoin(products, eq(products.id, stockMovements.productId))
        .where(eq(stockMovements.storeId, storeId))
        .orderBy(desc(stockMovements.seq))
        .limit(6),

      db()
        .select({
          id: cashSessions.id,
          openedAt: cashSessions.openedAt,
          openingAmountCents: cashSessions.openingAmountCents,
        })
        .from(cashSessions)
        .where(and(eq(cashSessions.storeId, storeId), eq(cashSessions.status, "ABERTO")))
        .limit(1),

      db()
        .select({ count: sql<number>`count(*)::int` })
        .from(customers)
        .where(eq(customers.storeId, storeId)),
    ]);

  const stock = stockSummary[0] ?? {
    active: 0,
    units: 0,
    saleValue: 0,
    costValue: 0,
  };
  const today = todaySales[0] ?? { count: 0, total: 0 };
  const expectedProfit = Number(stock.saleValue) - Number(stock.costValue);
  const session = openCash[0];

  return (
    <>
      <PageHeader
        title={`Olá, ${user.name.split(" ")[0]}`}
        description={`Resumo de ${user.storeName} agora.`}
        action={
          <div className="flex gap-2">
            <Link href="/caixa" className="btn btn-primary">
              <ShoppingCart className="size-4" />
              Abrir PDV
            </Link>
            {isAdminRole(user.role) ? (
              <Link href="/estoque/novo" className="btn btn-secondary">
                <Package className="size-4" />
                Novo produto
              </Link>
            ) : null}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Vendas de hoje"
          value={formatBRL(today.total)}
          hint={`${today.count} venda${today.count === 1 ? "" : "s"}`}
          tone={today.count > 0 ? "success" : "neutral"}
        />
        <Stat label="Itens em estoque" value={String(stock.units)} />
        <Stat
          label="Estoque a preço de venda"
          value={formatBRL(Number(stock.saleValue))}
          hint={`margem prevista ${formatBRL(expectedProfit)}`}
          tone={expectedProfit >= 0 ? "success" : "danger"}
        />
        <Stat
          label="Alertas de reposição"
          value={String(lowStock.length)}
          tone={lowStock.length > 0 ? "warning" : "success"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Reposição de estoque"
            description="Produtos no limite ou abaixo do estoque mínimo."
            action={
              <Link href="/estoque?situacao=baixo" className="btn btn-ghost text-xs">
                Ver todos
                <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          {lowStock.length === 0 ? (
            <EmptyState
              title="Nenhum produto crítico"
              description="Todos os itens estão acima do estoque mínimo."
            />
          ) : (
            <ul className="divide-y divide-ink-100">
              {lowStock.map((product) => (
                <li
                  key={product.id}
                  className="flex items-center justify-between gap-4 px-3 py-3 sm:px-5"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/estoque/${product.id}`}
                      className="truncate font-medium text-ink-900 hover:text-brand-700"
                    >
                      {product.name}
                    </Link>
                    <p className="text-xs text-ink-500">{product.code}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-ink-500">
                      mín. {product.minQuantity}
                    </span>
                    {product.quantity === 0 ? (
                      <Badge tone="danger">Zerado</Badge>
                    ) : (
                      <Badge tone="warning">
                        {product.quantity} {product.unit}
                      </Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Caixa"
              description="Sessão de caixa do turno atual."
              action={
                <Link href="/caixa/sessoes" className="btn btn-ghost text-xs">
                  Sessões
                  <ArrowRight className="size-3.5" />
                </Link>
              }
            />
            <div className="card-pad text-sm">
              {session ? (
                <p className="flex flex-wrap items-center gap-2 text-ink-700">
                  <Badge tone="success">Aberto</Badge>
                  <span>desde {formatDateTime(session.openedAt)}</span>
                  <span className="text-ink-500">
                    fundo {formatBRL(session.openingAmountCents)}
                  </span>
                </p>
              ) : (
                <p className="flex items-center gap-2 text-ink-600">
                  <AlertTriangle className="size-4 text-amber-500" />
                  Nenhuma sessão aberta. Abra o caixa para registrar vendas em
                  dinheiro.
                </p>
              )}
              <p className="mt-3 text-ink-500">
                Clientes cadastrados: <strong>{customerCount[0]?.count ?? 0}</strong>
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Últimas movimentações"
              action={
                <Link href="/estoque/movimentacoes" className="btn btn-ghost text-xs">
                  Ver todas
                  <ArrowRight className="size-3.5" />
                </Link>
              }
            />
            {recentMovements.length === 0 ? (
              <EmptyState title="Sem movimentações" />
            ) : (
              <ul className="divide-y divide-ink-100">
                {recentMovements.map((movement) => (
                  <li
                    key={movement.id}
                    className="flex items-center justify-between gap-4 px-3 py-3 sm:px-5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-900">
                        {movement.productName}
                      </p>
                      <p className="text-xs text-ink-500">
                        {formatDateTime(movement.createdAt)}
                        {movement.reason ? ` · ${movement.reason}` : ""}
                      </p>
                    </div>
                    <Badge
                      tone={
                        movement.type === "ENTRADA"
                          ? "success"
                          : movement.type === "SAIDA"
                            ? "danger"
                            : "info"
                      }
                    >
                      {movement.type === "SAIDA" ? "-" : "+"}
                      {movement.quantity}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
