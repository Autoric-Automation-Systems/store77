import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui";
import { CategoryForm, DeleteCategoryButton } from "./category-form";

export const metadata = { title: "Tipos e nichos" };

export default async function CategoriasPage() {
  const user = await requireAdmin();

  const rows = await db()
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      kind: categories.kind,
      description: categories.description,
      productCount: sql<number>`count(${products.id})::int`,
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .where(eq(categories.storeId, user.storeId))
    .groupBy(
      categories.id,
      categories.name,
      categories.slug,
      categories.kind,
      categories.description,
    )
    .orderBy(asc(categories.name));

  return (
    <>
      <PageHeader
        title="Tipos e nichos"
        description="Agrupe o estoque por natureza do produto ou segmento e organize o carrossel da vitrine."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader
            title="Categorias cadastradas"
            description="Excluir uma categoria deixa os produtos sem categoria."
          />
          {rows.length === 0 ? (
            <p className="card-pad text-sm text-ink-500">
              Nenhuma categoria ainda. Crie a primeira ao lado.
            </p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-4 px-3 py-3 sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-semibold text-ink-900">
                      {row.name}
                      <Badge tone={row.kind === "NICHO" ? "info" : "neutral"}>
                        {row.kind === "NICHO" ? "Nicho" : "Tipo"}
                      </Badge>
                    </p>
                    <p className="text-xs text-ink-500">
                      {row.description ?? `/${row.slug}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm text-ink-500">
                      {row.productCount} produto{row.productCount === 1 ? "" : "s"}
                    </span>
                    <DeleteCategoryButton id={row.id} name={row.name} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <CategoryForm />
      </div>
    </>
  );
}
