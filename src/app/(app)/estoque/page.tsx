import Link from "next/link";
import { and, asc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { ArrowLeftRight, Plus, Search } from "lucide-react";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { isAdminRole, requireUser } from "@/lib/auth";
import { formatBRL } from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader, Stat } from "@/components/ui";

export const metadata = { title: "Estoque" };

type Search = {
  q?: string;
  categoria?: string;
  situacao?: string;
};

export default async function EstoquePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const user = await requireUser();
  const { q = "", categoria = "", situacao = "todos" } = await searchParams;

  const filters: SQL[] = [eq(products.storeId, user.storeId)];

  if (q.trim()) {
    const term = `%${q.trim()}%`;
    const search = or(
      ilike(products.name, term),
      ilike(products.code, term),
      ilike(sql`coalesce(${products.barcode}, '')`, term),
    );
    if (search) filters.push(search);
  }

  if (categoria) filters.push(eq(products.categoryId, categoria));

  if (situacao === "baixo") {
    filters.push(
      sql`${products.quantity} <= ${products.minQuantity} and ${products.quantity} > 0`,
    );
  } else if (situacao === "zerado") {
    filters.push(eq(products.quantity, 0));
  } else if (situacao === "inativo") {
    filters.push(eq(products.active, false));
  } else {
    filters.push(eq(products.active, true));
  }

  const [rows, categoryOptions, summary] = await Promise.all([
    db()
      .select({
        id: products.id,
        code: products.code,
        name: products.name,
        unit: products.unit,
        priceCents: products.priceCents,
        quantity: products.quantity,
        minQuantity: products.minQuantity,
        location: products.location,
        active: products.active,
        categoryName: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .where(and(...filters))
      .orderBy(asc(products.name))
      .limit(200),

    db()
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(eq(categories.storeId, user.storeId))
      .orderBy(asc(categories.name)),

    db()
      .select({
        total: sql<number>`count(*)::int`,
        units: sql<number>`coalesce(sum(${products.quantity}), 0)::int`,
        stockValue: sql<number>`coalesce(sum(${products.quantity} * ${products.priceCents}), 0)::bigint`,
        lowStock: sql<number>`count(*) filter (where ${products.quantity} <= ${products.minQuantity})::int`,
      })
      .from(products)
      .where(and(eq(products.storeId, user.storeId), eq(products.active, true))),
  ]);

  const stats = summary[0] ?? {
    total: 0,
    units: 0,
    stockValue: 0,
    lowStock: 0,
  };
  const isAdmin = isAdminRole(user.role);

  return (
    <>
      <PageHeader
        title="Estoque"
        description="Cadastro de produtos, saldo atual e alertas de reposição."
        action={
          isAdmin ? (
            <Link href="/estoque/novo" className="btn btn-primary">
              <Plus className="size-4" />
              Novo produto
            </Link>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Produtos ativos" value={String(stats.total)} />
        <Stat label="Itens em estoque" value={String(stats.units)} />
        <Stat label="Valor a preço de venda" value={formatBRL(Number(stats.stockValue))} />
        <Stat
          label="Precisam de reposição"
          value={String(stats.lowStock)}
          tone={stats.lowStock > 0 ? "warning" : "success"}
          hint={stats.lowStock > 0 ? "abaixo do mínimo" : "tudo em ordem"}
        />
      </div>

      <Card>
        <form className="grid gap-3 border-b border-ink-200 p-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end sm:px-6">
          <div>
            <label className="label" htmlFor="q">
              Buscar
            </label>
            <input
              id="q"
              name="q"
              defaultValue={q}
              className="input"
              placeholder="Nome, código ou código de barras"
            />
          </div>
          <div>
            <label className="label" htmlFor="categoria">
              Tipo
            </label>
            <select
              id="categoria"
              name="categoria"
              defaultValue={categoria}
              className="input"
            >
              <option value="">Todos</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="situacao">
              Situação
            </label>
            <select
              id="situacao"
              name="situacao"
              defaultValue={situacao}
              className="input"
            >
              <option value="todos">Ativos</option>
              <option value="baixo">Estoque baixo</option>
              <option value="zerado">Zerados</option>
              <option value="inativo">Inativos</option>
            </select>
          </div>
          <button type="submit" className="btn btn-secondary">
            <Search className="size-4" />
            Filtrar
          </button>
        </form>

        {rows.length === 0 ? (
          <EmptyState
            title="Nenhum produto encontrado"
            description="Ajuste os filtros ou cadastre o primeiro produto do seu estoque."
            action={
              isAdmin ? (
                <Link href="/estoque/novo" className="btn btn-primary">
                  Cadastrar produto
                </Link>
              ) : null
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-ink-200 text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-3 py-3 sm:px-5">Produto</th>
                  <th className="hidden px-3 py-3 sm:table-cell sm:px-5">Tipo</th>
                  <th className="hidden px-3 py-3 lg:table-cell lg:px-5">Local</th>
                  <th className="hidden px-3 py-3 text-right sm:table-cell sm:px-5">
                    Preço
                  </th>
                  <th className="px-3 py-3 sm:px-5 text-right">Saldo</th>
                  <th className="px-3 py-3 sm:px-5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rows.map((row) => {
                  const low = row.quantity <= row.minQuantity;
                  const out = row.quantity === 0;
                  return (
                    <tr key={row.id} className="hover:bg-ink-50">
                      <td className="px-3 py-3 sm:px-5">
                        <Link
                          href={`/estoque/${row.id}`}
                          className="font-semibold text-ink-900 hover:text-brand-700"
                        >
                          {row.name}
                        </Link>
                        <p className="text-xs text-ink-500">{row.code}</p>
                      </td>
                      <td className="hidden px-3 py-3 text-ink-600 sm:table-cell sm:px-5">
                        {row.categoryName ?? "—"}
                      </td>
                      <td className="hidden px-3 py-3 text-ink-600 lg:table-cell lg:px-5">
                        {row.location ?? "—"}
                      </td>
                      <td className="hidden px-3 py-3 text-right font-medium sm:table-cell sm:px-5">
                        {formatBRL(row.priceCents)}
                      </td>
                      <td className="px-3 py-3 sm:px-5 text-right">
                        {out ? (
                          <Badge tone="danger">Sem estoque</Badge>
                        ) : low ? (
                          <Badge tone="warning">
                            {row.quantity} {row.unit}
                          </Badge>
                        ) : (
                          <span className="font-medium">
                            {row.quantity} {row.unit}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right sm:px-5">
                        <Link
                          href={`/estoque/movimentacoes?produto=${row.id}`}
                          className="text-xs font-semibold text-brand-600"
                          aria-label={`Movimentar ${row.name}`}
                          title={`Movimentar ${row.name}`}
                        >
                          {/* Em telas muito estreitas o rótulo não cabe; o ícone
                              mantém a ação acessível sem alargar a tabela. */}
                          <ArrowLeftRight className="size-4 sm:hidden" />
                          <span className="hidden sm:inline">Movimentar</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
