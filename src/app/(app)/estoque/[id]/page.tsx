import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { ArrowLeft, Package } from "lucide-react";
import { db } from "@/db";
import {
  categories,
  productImages,
  products,
  stockMovements,
  users,
} from "@/db/schema";
import { isAdminRole, requireUser } from "@/lib/auth";
import { formatBRL, formatDateTime } from "@/lib/format";
import { Badge, Card, CardHeader, EmptyState, Stat } from "@/components/ui";
import { ProductForm } from "../produto-form";
import { ProductActions } from "./product-actions";

export const metadata = { title: "Produto" };

const MOVEMENT_LABELS = {
  ENTRADA: "Entrada",
  SAIDA: "Saída",
  AJUSTE: "Ajuste",
} as const;

const MOVEMENT_TONES = {
  ENTRADA: "success",
  SAIDA: "danger",
  AJUSTE: "info",
} as const;

export default async function ProdutoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const [product] = await db()
    .select({
      id: products.id,
      code: products.code,
      name: products.name,
      description: products.description,
      categoryId: products.categoryId,
      barcode: products.barcode,
      unit: products.unit,
      priceCents: products.priceCents,
      costCents: products.costCents,
      quantity: products.quantity,
      minQuantity: products.minQuantity,
      location: products.location,
      active: products.active,
      categoryName: categories.name,
    })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(and(eq(products.id, id), eq(products.storeId, user.storeId)))
    .limit(1);

  if (!product) notFound();

  const [images, movements, categoryOptions] = await Promise.all([
    db()
      .select({ url: productImages.url })
      .from(productImages)
      .where(eq(productImages.productId, product.id))
      .orderBy(asc(productImages.sortOrder)),

    db()
      .select({
        id: stockMovements.id,
        type: stockMovements.type,
        quantity: stockMovements.quantity,
        balanceAfter: stockMovements.balanceAfter,
        reason: stockMovements.reason,
        createdAt: stockMovements.createdAt,
        userEmail: users.email,
      })
      .from(stockMovements)
      .leftJoin(users, eq(users.id, stockMovements.userId))
      .where(eq(stockMovements.productId, product.id))
      .orderBy(desc(stockMovements.seq))
      .limit(50),

    db()
      .select({ id: categories.id, name: categories.name, kind: categories.kind })
      .from(categories)
      .where(eq(categories.storeId, user.storeId))
      .orderBy(asc(categories.name)),
  ]);

  const isAdmin = isAdminRole(user.role);
  const margin =
    product.priceCents > 0
      ? Math.round(
          ((product.priceCents - product.costCents) / product.priceCents) * 100,
        )
      : 0;

  return (
    <>
      <Link
        href="/estoque"
        className="inline-flex items-center gap-2 text-sm font-medium text-ink-600 hover:text-ink-900"
      >
        <ArrowLeft className="size-4" />
        Voltar para o estoque
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">
            {product.name}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-500">
            <span>{product.code}</span>
            {product.categoryName ? (
              <>
                <span aria-hidden>·</span>
                <span>{product.categoryName}</span>
              </>
            ) : null}
            {product.location ? (
              <>
                <span aria-hidden>·</span>
                <span>{product.location}</span>
              </>
            ) : null}
            {product.active ? (
              <Badge tone="success">Ativo</Badge>
            ) : (
              <Badge tone="neutral">Inativo</Badge>
            )}
          </p>
        </div>
        {isAdmin ? <ProductActions productId={product.id} /> : null}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Saldo atual" value={`${product.quantity} ${product.unit}`} />
        <Stat label="Preço de venda" value={formatBRL(product.priceCents)} />
        <Stat label="Custo" value={formatBRL(product.costCents)} />
        <Stat
          label="Margem bruta"
          value={`${margin}%`}
          tone={margin >= 0 ? "success" : "danger"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          {isAdmin ? (
            <ProductForm
              categories={categoryOptions}
              product={{
                id: product.id,
                code: product.code,
                name: product.name,
                description: product.description,
                categoryId: product.categoryId,
                barcode: product.barcode,
                unit: product.unit,
                priceCents: product.priceCents,
                costCents: product.costCents,
                quantity: product.quantity,
                minQuantity: product.minQuantity,
                location: product.location,
                active: product.active,
                images: images.map((image) => image.url),
              }}
            />
          ) : (
            <Card>
              <CardHeader title="Detalhes" />
              <div className="card-pad space-y-3 text-sm text-ink-600">
                <p>{product.description ?? "Sem descrição cadastrada."}</p>
                <p>
                  Estoque mínimo: <strong>{product.minQuantity}</strong>
                </p>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Fotos" />
            {images.length === 0 ? (
              <EmptyState
                title="Sem fotos"
                description="Adicione imagens no cadastro."
              />
            ) : (
              <div className="card-pad flex flex-wrap gap-3">
                {images.map((image) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={image.url}
                    src={image.url}
                    alt={product.name}
                    className="size-20 rounded-xl border border-ink-200 object-cover"
                  />
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Histórico de movimentações"
              action={
                <Link
                  href={`/estoque/movimentacoes?produto=${product.id}`}
                  className="btn btn-secondary px-3 py-2 text-xs"
                >
                  Movimentar
                </Link>
              }
            />
            {movements.length === 0 ? (
              <EmptyState
                title="Sem movimentações"
                description="Entradas e saídas aparecem aqui."
              />
            ) : (
              <ul className="divide-y divide-ink-100">
                {movements.map((movement) => (
                  <li key={movement.id} className="flex items-start gap-3 px-3 py-3 sm:px-5">
                    <Package className="mt-0.5 size-4 text-ink-400" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <Badge tone={MOVEMENT_TONES[movement.type]}>
                          {MOVEMENT_LABELS[movement.type]}
                        </Badge>
                        <span className="text-sm font-semibold text-ink-900">
                          {movement.type === "SAIDA" ? "-" : "+"}
                          {movement.quantity}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-ink-500">
                        Saldo {movement.balanceAfter}
                        {movement.reason ? ` · ${movement.reason}` : ""}
                      </p>
                      <p className="text-xs text-ink-400">
                        {formatDateTime(movement.createdAt)}
                        {movement.userEmail ? ` · ${movement.userEmail}` : ""}
                      </p>
                    </div>
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
