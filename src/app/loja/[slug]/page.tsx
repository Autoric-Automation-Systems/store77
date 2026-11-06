import type { Metadata } from "next";
import Image from "next/image";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { categories, productImages, products, stores } from "@/db/schema";
import { toAbsoluteUrl } from "@/lib/blob";
import { getStoreAccess } from "@/lib/billing/entitlements";
import { hexToRgbChannels } from "@/lib/slug";
import { CatalogCard, type StorefrontProduct } from "./catalog-card";
import { whatsappLink } from "./links";
import { StoreFooter, StoreHeader } from "./store-chrome";

export const dynamic = "force-dynamic";

async function loadStore(slug: string) {
  const [store] = await db()
    .select()
    .from(stores)
    .where(eq(stores.slug, slug))
    .limit(1);
  return store ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const store = await loadStore(slug);
    if (!store) return { title: "Loja não encontrada" };
    const host = (await headers()).get("host");
    return {
      title: store.heroTitle ?? store.name,
      description:
        store.heroSubtitle ??
        `Confira o catálogo e a disponibilidade de ${store.name}.`,
      openGraph: {
        title: store.heroTitle ?? store.name,
        description: store.heroSubtitle ?? undefined,
        images: store.heroImageUrl
          ? [toAbsoluteUrl(store.heroImageUrl, host)]
          : undefined,
      },
    };
  } catch {
    return { title: "Loja" };
  }
}

export default async function PublicStorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await loadStore(slug);

  if (!store || !store.isPublic) notFound();

  // Assinatura suspensa derruba a vitrine: o catálogo é parte do serviço.
  const { access } = await getStoreAccess(store.id);
  if (!access.capabilities.publishStorefront) notFound();

  const visibility = store.showOutOfStock
    ? eq(products.active, true)
    : and(eq(products.active, true), ne(products.quantity, 0));

  const [catalog, categoryRows] = await Promise.all([
    db()
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
        categoryId: products.categoryId,
      })
      .from(products)
      .where(and(eq(products.storeId, store.id), visibility))
      .orderBy(asc(products.name))
      .limit(300),

    db()
      .select({
        id: categories.id,
        name: categories.name,
        description: categories.description,
        kind: categories.kind,
      })
      .from(categories)
      .where(and(eq(categories.storeId, store.id), eq(categories.active, true)))
      .orderBy(asc(categories.sortOrder), asc(categories.name)),
  ]);

  const ids = catalog.map((product) => product.id);
  const images =
    ids.length > 0
      ? await db()
          .select({
            productId: productImages.productId,
            url: productImages.url,
            sortOrder: productImages.sortOrder,
          })
          .from(productImages)
          .where(inArray(productImages.productId, ids))
          .orderBy(asc(productImages.sortOrder))
      : [];

  // A capa é a primeira foto da ordenação; o card recebe a lista completa para
  // as setas percorrerem as demais.
  const imagesByProduct = new Map<string, string[]>();
  for (const image of images) {
    const list = imagesByProduct.get(image.productId);
    if (list) list.push(image.url);
    else imagesByProduct.set(image.productId, [image.url]);
  }

  const withImages: (StorefrontProduct & { categoryId: string | null })[] =
    catalog.map((product) => ({
      ...product,
      images: imagesByProduct.get(product.id) ?? [],
      href: `/loja/${store.slug}/produto/${product.id}`,
      whatsappHref: store.whatsapp
        ? whatsappLink(store.whatsapp, store.name, product)
        : null,
    }));

  const groups = [
    ...categoryRows.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      items: withImages.filter((product) => product.categoryId === category.id),
    })),
    {
      id: "sem-categoria",
      name: "Outros produtos",
      description: null as string | null,
      items: withImages.filter((product) => !product.categoryId),
    },
  ].filter((group) => group.items.length > 0);

  const style = {
    "--brand": store.primaryColor,
    "--brand-rgb": hexToRgbChannels(store.primaryColor),
    "--accent": store.accentColor,
    "--dark": store.secondaryColor,
  } as React.CSSProperties;

  return (
    <div className="min-h-screen bg-white" style={style}>
      <StoreHeader store={store} />

      <section
        className="relative overflow-hidden text-white"
        style={{ backgroundColor: store.secondaryColor }}
      >
        {store.heroImageUrl ? (
          <Image
            src={store.heroImageUrl}
            alt=""
            fill
            className="object-cover opacity-25"
            unoptimized
            priority
          />
        ) : null}

        <div className="relative mx-auto max-w-6xl px-5 py-20 sm:py-28">
          <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-5xl">
            {store.heroTitle ?? store.name}
          </h1>
          {store.heroSubtitle ? (
            <p className="mt-4 max-w-2xl text-lg text-white/80">
              {store.heroSubtitle}
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            {groups.length > 0 ? (
              <a
                href={`#${groups[0].id}`}
                className="rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                style={{ backgroundColor: store.accentColor }}
              >
                Ver produtos
              </a>
            ) : null}
            {store.whatsapp ? (
              <a
                href={whatsappLink(store.whatsapp, store.name)}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Pedir pelo WhatsApp
              </a>
            ) : null}
          </div>
        </div>
      </section>

      {groups.length > 0 ? (
        <nav className="border-b border-ink-200 bg-white">
          <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-5 py-3">
            {groups.map((group) => (
              <a
                key={group.id}
                href={`#${group.id}`}
                className="shrink-0 rounded-full bg-ink-100 px-4 py-2 text-sm font-medium text-ink-700 transition hover:text-ink-900"
              >
                {group.name}
              </a>
            ))}
          </div>
        </nav>
      ) : null}

      <main className="mx-auto max-w-6xl space-y-14 px-5 py-12">
        {groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-300 px-6 py-16 text-center">
            <p className="text-lg font-semibold text-ink-800">
              Catálogo em atualização
            </p>
            <p className="mt-2 text-sm text-ink-500">
              Assim que houver produtos em estoque, eles aparecem aqui
              automaticamente.
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.id} id={group.id} className="scroll-mt-20">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <h2 className="text-2xl font-bold tracking-tight text-ink-900">
                  {group.name}
                </h2>
                <span className="text-sm text-ink-500">
                  {group.items.length} produto
                  {group.items.length === 1 ? "" : "s"}
                </span>
              </div>
              {group.description ? (
                <p className="mt-1 text-sm text-ink-500">{group.description}</p>
              ) : null}

              {/* Carrossel horizontal: rolagem por encaixe, sem dependência de JS */}
              <div className="-mx-5 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2">
                {group.items.map((product) => (
                  <div key={product.id} className="w-56 shrink-0 sm:w-60">
                    <CatalogCard
                      product={product}
                      primaryColor={store.primaryColor}
                      accentColor={store.accentColor}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))
        )}

        {store.aboutText ? (
          <section className="rounded-2xl bg-ink-50 p-8">
            <h2 className="text-xl font-bold text-ink-900">Sobre a loja</h2>
            <p className="mt-3 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-ink-600">
              {store.aboutText}
            </p>
          </section>
        ) : null}
      </main>

      <StoreFooter store={store} />
    </div>
  );
}
