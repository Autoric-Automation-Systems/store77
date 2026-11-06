import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { ChevronRight, MessageCircle, Package, Tag, Truck } from "lucide-react";
import { db } from "@/db";
import { categories, productImages, products, stores } from "@/db/schema";
import { toAbsoluteUrl } from "@/lib/blob";
import { getStoreAccess } from "@/lib/billing/entitlements";
import { formatBRL } from "@/lib/format";
import { installmentLabel, installmentPlan } from "@/lib/installments";
import { hexToRgbChannels } from "@/lib/slug";
import { CatalogCard, type StorefrontProduct } from "../../catalog-card";
import { whatsappLink } from "../../links";
import { ProductGallery } from "../../product-gallery";
import { StoreFooter, StoreHeader } from "../../store-chrome";

export const dynamic = "force-dynamic";

async function loadStore(slug: string) {
  const [store] = await db()
    .select()
    .from(stores)
    .where(eq(stores.slug, slug))
    .limit(1);
  return store ?? null;
}

async function loadProduct(slug: string, id: string) {
  const store = await loadStore(slug);
  if (!store || !store.isPublic) return null;

  const [product] = await db()
    .select({
      id: products.id,
      code: products.code,
      name: products.name,
      description: products.description,
      priceCents: products.priceCents,
      creditPriceCents: products.creditPriceCents,
      installments: products.installments,
      quantity: products.quantity,
      unit: products.unit,
      minQuantity: products.minQuantity,
      location: products.location,
      categoryId: products.categoryId,
    })
    .from(products)
    .where(
      and(
        eq(products.id, id),
        eq(products.storeId, store.id),
        eq(products.active, true),
      ),
    )
    .limit(1);

  if (!product) return null;
  return { store, product };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}): Promise<Metadata> {
  const { slug, id } = await params;
  try {
    const loaded = await loadProduct(slug, id);
    if (!loaded) return { title: "Produto não encontrado" };
    const { store, product } = loaded;
    const host = (await headers()).get("host");
    const [cover] = await db()
      .select({ url: productImages.url })
      .from(productImages)
      .where(eq(productImages.productId, product.id))
      .orderBy(asc(productImages.sortOrder))
      .limit(1);

    return {
      title: `${product.name} · ${store.name}`,
      description:
        product.description?.slice(0, 160) ??
        `${product.name} por ${formatBRL(product.priceCents)} na vitrine de ${store.name}.`,
      openGraph: {
        title: `${product.name} · ${store.name}`,
        description: product.description?.slice(0, 200) ?? undefined,
        images: cover?.url ? [toAbsoluteUrl(cover.url, host)] : undefined,
      },
    };
  } catch {
    return { title: "Produto" };
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const loaded = await loadProduct(slug, id);
  if (!loaded) notFound();

  const { store, product } = loaded;

  const { access } = await getStoreAccess(store.id);
  if (!access.capabilities.publishStorefront) notFound();

  const [imageRows, categoryRow] = await Promise.all([
    db()
      .select({ url: productImages.url })
      .from(productImages)
      .where(eq(productImages.productId, product.id))
      .orderBy(asc(productImages.sortOrder)),
    product.categoryId
      ? db()
          .select({ id: categories.id, name: categories.name })
          .from(categories)
          .where(eq(categories.id, product.categoryId))
          .limit(1)
      : Promise.resolve([]),
  ]);

  const category = categoryRow[0] ?? null;
  const images = imageRows.map((image) => image.url);
  const available = product.quantity > 0;
  const plan = installmentPlan(
    product.priceCents,
    product.creditPriceCents,
    product.installments,
  );
  const planLabel = installmentLabel(plan);

  const relatedRows = await db()
    .select({
      id: products.id,
      code: products.code,
      name: products.name,
      description: products.description,
      priceCents: products.priceCents,
      creditPriceCents: products.creditPriceCents,
      installments: products.installments,
      quantity: products.quantity,
      unit: products.unit,
      minQuantity: products.minQuantity,
    })
    .from(products)
    .where(
      and(
        eq(products.storeId, store.id),
        eq(products.active, true),
        ne(products.id, product.id),
        ...(product.categoryId
          ? [eq(products.categoryId, product.categoryId)]
          : []),
      ),
    )
    .orderBy(asc(products.name))
    .limit(8);

  const relatedIds = relatedRows.map((row) => row.id);
  const relatedImages =
    relatedIds.length > 0
      ? await db()
          .select({ productId: productImages.productId, url: productImages.url })
          .from(productImages)
          .where(inArray(productImages.productId, relatedIds))
          .orderBy(asc(productImages.sortOrder))
      : [];

  const relatedImageMap = new Map<string, string[]>();
  for (const image of relatedImages) {
    const list = relatedImageMap.get(image.productId);
    if (list) list.push(image.url);
    else relatedImageMap.set(image.productId, [image.url]);
  }

  const related: StorefrontProduct[] = relatedRows.map((row) => ({
    ...row,
    images: relatedImageMap.get(row.id) ?? [],
    href: `/loja/${store.slug}/produto/${row.id}`,
    whatsappHref: store.whatsapp
      ? whatsappLink(store.whatsapp, store.name, row)
      : null,
  }));

  const style = {
    "--brand": store.primaryColor,
    "--brand-rgb": hexToRgbChannels(store.primaryColor),
    "--accent": store.accentColor,
    "--dark": store.secondaryColor,
  } as React.CSSProperties;

  return (
    <div className="min-h-screen bg-white" style={style}>
      <StoreHeader store={store} />

      <main className="mx-auto max-w-6xl px-5 py-6 sm:py-8">
        <nav className="flex flex-wrap items-center gap-1 text-sm text-ink-500">
          <Link href={`/loja/${store.slug}`} className="hover:text-ink-800">
            {store.name}
          </Link>
          {category ? (
            <>
              <ChevronRight className="size-3.5" />
              <Link
                href={`/loja/${store.slug}#${category.id}`}
                className="hover:text-ink-800"
              >
                {category.name}
              </Link>
            </>
          ) : null}
          <ChevronRight className="size-3.5" />
          <span className="truncate text-ink-700">{product.name}</span>
        </nav>

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <ProductGallery images={images} alt={product.name} variant="detail" />
          </div>

          <div className="flex flex-col gap-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                {available ? "Novo" : "Indisponível"} · Código {product.code}
              </p>
              <h1 className="mt-1 text-2xl font-bold leading-snug tracking-tight text-ink-900 sm:text-3xl">
                {product.name}
              </h1>
            </div>

            <div>
              <p
                className="text-3xl font-bold tracking-tight"
                style={{ color: store.primaryColor }}
              >
                {formatBRL(product.priceCents)}
              </p>
              <p className="mt-1 text-sm text-ink-600">
                à vista
                {planLabel ? ` · ${planLabel}` : ""}
              </p>
              {plan && !plan.interestFree ? (
                <p className="text-sm text-ink-500">
                  Total no crédito:{" "}
                  <span className="font-semibold">
                    {formatBRL(plan.totalCents)}
                  </span>
                </p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-ink-200 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink-800">
                <Truck className="size-4" />
                {available ? "Pronto para retirada" : "Sem estoque no momento"}
              </p>
              <p className="mt-1 text-sm text-ink-600">
                {available ? (
                  <>
                    {product.quantity} {product.unit} em estoque
                    {product.minQuantity > 1
                      ? ` · venda mínima de ${product.minQuantity} ${product.unit}`
                      : ""}
                  </>
                ) : (
                  "Fale com a loja para saber quando chega."
                )}
              </p>
              {product.location && available ? (
                <p className="mt-1 flex items-center gap-2 text-sm text-ink-500">
                  <Tag className="size-3.5" />
                  {product.location}
                </p>
              ) : null}
            </div>

            {store.whatsapp ? (
              <a
                href={whatsappLink(store.whatsapp, store.name, product)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                style={{ backgroundColor: store.accentColor }}
              >
                <MessageCircle className="size-4" />
                Pedir no WhatsApp
              </a>
            ) : null}

            {product.description ? (
              <section className="border-t border-ink-200 pt-5">
                <h2 className="text-lg font-bold text-ink-900">
                  Descrição do produto
                </h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-600">
                  {product.description}
                </p>
              </section>
            ) : null}

            <section className="border-t border-ink-200 pt-5 text-sm text-ink-500">
              <h2 className="text-lg font-bold text-ink-900">Sobre a loja</h2>
              <p className="mt-2">
                {store.aboutText ??
                  `${store.name} atende pelo WhatsApp e atualiza o catálogo automaticamente pelo estoque.`}
              </p>
              {store.address ? <p className="mt-2">{store.address}</p> : null}
            </section>
          </div>
        </div>

        {related.length > 0 ? (
          <section className="mt-14">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-xl font-bold tracking-tight text-ink-900">
                Quem viu este produto também viu
              </h2>
              <Link
                href={`/loja/${store.slug}`}
                className="text-sm font-medium text-ink-600 underline hover:text-ink-900"
              >
                Ver catálogo completo
              </Link>
            </div>
            <div className="-mx-5 mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2">
              {related.map((item) => (
                <div key={item.id} className="w-56 shrink-0 sm:w-60">
                  <CatalogCard
                    product={item}
                    primaryColor={store.primaryColor}
                    accentColor={store.accentColor}
                  />
                </div>
              ))}
            </div>
          </section>
        ) : (
          <p className="mt-14 flex items-center gap-2 text-sm text-ink-400">
            <Package className="size-4" />
            Este é o único produto ativo desta categoria.
          </p>
        )}
      </main>

      <StoreFooter store={store} />
    </div>
  );
}
