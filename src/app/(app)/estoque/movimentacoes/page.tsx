import { and, asc, desc, eq, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { products, stockMovements, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatDateTime, formatDateTimeShort } from "@/lib/format";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { MovementForm } from "./movement-form";

export const metadata = { title: "Movimentações" };

const LABELS = {
  ENTRADA: "Entrada",
  SAIDA: "Saída",
  AJUSTE: "Ajuste",
} as const;

const TONES = {
  ENTRADA: "success",
  SAIDA: "danger",
  AJUSTE: "info",
} as const;

export default async function MovimentacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ produto?: string; tipo?: string }>;
}) {
  const user = await requireUser();
  const { produto = "", tipo = "" } = await searchParams;

  const filters: SQL[] = [eq(stockMovements.storeId, user.storeId)];
  if (produto) filters.push(eq(stockMovements.productId, produto));
  if (tipo === "ENTRADA" || tipo === "SAIDA" || tipo === "AJUSTE") {
    filters.push(eq(stockMovements.type, tipo));
  }

  const [productOptions, movements] = await Promise.all([
    db()
      .select({
        id: products.id,
        code: products.code,
        name: products.name,
        unit: products.unit,
        quantity: products.quantity,
      })
      .from(products)
      .where(
        and(eq(products.storeId, user.storeId), eq(products.active, true)),
      )
      .orderBy(asc(products.name)),

    db()
      .select({
        id: stockMovements.id,
        type: stockMovements.type,
        quantity: stockMovements.quantity,
        balanceAfter: stockMovements.balanceAfter,
        reason: stockMovements.reason,
        reference: stockMovements.reference,
        createdAt: stockMovements.createdAt,
        productName: products.name,
        productCode: products.code,
        unit: products.unit,
        userEmail: users.email,
      })
      .from(stockMovements)
      .innerJoin(products, eq(products.id, stockMovements.productId))
      .leftJoin(users, eq(users.id, stockMovements.userId))
      .where(and(...filters))
      .orderBy(desc(stockMovements.seq))
      .limit(100),
  ]);

  return (
    <>
      <PageHeader
        title="Movimentações de estoque"
        description="Entradas, saídas e ajustes com saldo resultante de cada lançamento."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader
            title="Histórico"
            description="Últimos 100 lançamentos da loja."
            action={
              <form className="flex gap-2">
                <select name="tipo" defaultValue={tipo} className="input py-2 text-xs">
                  <option value="">Todos os tipos</option>
                  <option value="ENTRADA">Entradas</option>
                  <option value="SAIDA">Saídas</option>
                  <option value="AJUSTE">Ajustes</option>
                </select>
                {produto ? (
                  <input type="hidden" name="produto" value={produto} />
                ) : null}
                <button type="submit" className="btn btn-secondary px-3 py-2 text-xs">
                  Filtrar
                </button>
              </form>
            }
          />

          {movements.length === 0 ? (
            <EmptyState
              title="Nenhuma movimentação"
              description="Registre uma entrada para começar a acompanhar o saldo."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-ink-200 text-sm">
                <thead className="table-head">
                  <tr>
                    <th className="px-3 py-3 sm:px-5">Data</th>
                    <th className="px-3 py-3 sm:px-5">Produto</th>
                    <th className="hidden px-3 py-3 sm:table-cell sm:px-5">Tipo</th>
                    <th className="px-3 py-3 text-right sm:px-5">Qtd.</th>
                    <th className="hidden px-3 py-3 text-right lg:table-cell lg:px-5">
                      Saldo
                    </th>
                    <th className="hidden px-3 py-3 2xl:table-cell 2xl:px-5">Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {movements.map((movement) => (
                    <tr key={movement.id} className="hover:bg-ink-50">
                      <td className="whitespace-nowrap px-3 py-3 text-ink-500 sm:px-5">
                        <span className="sm:hidden">
                          {formatDateTimeShort(movement.createdAt)}
                        </span>
                        <span className="hidden sm:inline">
                          {formatDateTime(movement.createdAt)}
                        </span>
                      </td>
                      <td className="px-3 py-3 sm:px-5">
                        <span className="font-medium text-ink-900">
                          {movement.productName}
                        </span>
                        <span className="block text-xs text-ink-500">
                          {movement.productCode}
                        </span>
                      </td>
                      <td className="hidden px-3 py-3 sm:table-cell sm:px-5">
                        <Badge tone={TONES[movement.type]}>
                          {LABELS[movement.type]}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-right font-semibold sm:px-5">
                        {movement.type === "SAIDA" ? "-" : "+"}
                        {movement.quantity} {movement.unit}
                      </td>
                      <td className="hidden px-3 py-3 text-right text-ink-600 lg:table-cell lg:px-5">
                        {movement.balanceAfter}
                      </td>
                      <td className="hidden px-3 py-3 text-ink-500 2xl:table-cell 2xl:px-5">
                        {movement.reason ?? movement.reference ?? "—"}
                        {movement.userEmail ? (
                          <span className="block text-xs text-ink-400">
                            {movement.userEmail}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <MovementForm
          products={productOptions}
          defaultProductId={produto || undefined}
        />
      </div>
    </>
  );
}
