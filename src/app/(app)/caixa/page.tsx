import Link from "next/link";
import { and, asc, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { cashSessions, categories, customers, products } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { Alert, PageHeader } from "@/components/ui";
import { Pdv } from "./pdv";

export const metadata = { title: "PDV" };

export default async function CaixaPage() {
  const user = await requireUser();
  const storeId = user.storeId;

  const [productRows, categoryRows, customerRows, openCash] = await Promise.all([
    db()
      .select({
        id: products.id,
        code: products.code,
        name: products.name,
        unit: products.unit,
        priceCents: products.priceCents,
        quantity: products.quantity,
        categoryId: products.categoryId,
        categoryName: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .where(
        and(
          eq(products.storeId, storeId),
          eq(products.active, true),
          gt(products.quantity, 0),
        ),
      )
      .orderBy(asc(products.name)),

    db()
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(eq(categories.storeId, storeId))
      .orderBy(asc(categories.name)),

    db()
      .select({ id: customers.id, name: customers.name })
      .from(customers)
      .where(eq(customers.storeId, storeId))
      .orderBy(asc(customers.name)),

    db()
      .select({ id: cashSessions.id })
      .from(cashSessions)
      .where(
        and(
          eq(cashSessions.storeId, storeId),
          eq(cashSessions.status, "ABERTO"),
        ),
      )
      .limit(1),
  ]);

  const hasOpenSession = openCash.length > 0;

  return (
    <>
      <PageHeader
        title="PDV / Caixa"
        description="Monte o carrinho, escolha a forma de pagamento e finalize a venda."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/caixa/vendas" className="btn btn-secondary">
              Vendas
            </Link>
            <Link href="/caixa/sessoes" className="btn btn-secondary">
              Sessões de caixa
            </Link>
          </div>
        }
      />

      {hasOpenSession ? null : (
        <Alert tone="warning">
          Nenhuma sessão de caixa aberta. A venda será registrada normalmente, mas
          o dinheiro recebido só entra no caixa depois que você abrir a sessão.{" "}
          <Link href="/caixa/sessoes" className="font-semibold underline">
            Abrir sessão de caixa
          </Link>
        </Alert>
      )}

      <Pdv
        products={productRows}
        categories={categoryRows}
        customers={customerRows}
      />
    </>
  );
}
