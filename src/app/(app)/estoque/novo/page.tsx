import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { ProductForm } from "../produto-form";

export const metadata = { title: "Novo produto" };

export default async function NovoProdutoPage() {
  const user = await requireAdmin();

  const categoryOptions = await db()
    .select({ id: categories.id, name: categories.name, kind: categories.kind })
    .from(categories)
    .where(eq(categories.storeId, user.storeId))
    .orderBy(asc(categories.name));

  return (
    <>
      <PageHeader
        title="Novo produto"
        description="Cadastre o item para que ele passe a contar no estoque, no PDV e na vitrine."
      />

      {categoryOptions.length === 0 ? (
        <Card className="card-pad text-sm text-ink-600">
          Dica: crie tipos/nichos em{" "}
          <span className="font-semibold">Tipos e nichos</span> para organizar o
          carrossel da vitrine por categoria.
        </Card>
      ) : null}

      <ProductForm categories={categoryOptions} />
    </>
  );
}
