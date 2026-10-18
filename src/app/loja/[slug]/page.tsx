import type { Metadata } from "next";
import Image from "next/image";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { MapPin, MessageCircle, Package, Phone } from "lucide-react";
import { db } from "@/db";
import {
  categories,
  productImages,
  products,
  stores,
  type Product,
} from "@/db/schema";
import { toAbsoluteUrl } from "@/lib/blob";
import { getStoreAccess } from "@/lib/billing/entitlements";
import { formatBRL } from "@/lib/format";
import { COMPANY, PRODUCT } from "@/lib/legal";
import { hexToRgbChannels } from "@/lib/slug";

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

type CatalogProduct = Pick<
  Product,
  "id" | "code" | "name" | "description" | "priceCents" | "quantity" | "unit" | "minQuantity" | "categoryId"
> & { coverUrl: string | null };

function whatsappLink(whatsapp: string, storeName: string, product?: CatalogProduct) {
  const digits = whatsapp.replace(/\D/g, "");
  const text = product
    ? `Olá! Vi "${product.name}" (${product.code}) na vitrine de ${storeName} e gostaria de mais informações.`
    : `Olá! Gostaria de mais informações sobre os produtos de ${storeName}.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function ProductCard({
  product,
  primaryColor,
  accentColor,
  whatsapp,
  storeName,
}: {
  product: CatalogProduct;
  primaryColor: string;
  accentColor: string;
  whatsapp: string | null;
  storeName: string;
}) {
  const available = product.quantity > 0;

  return (
    <article className="snap-start overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm">
      <div className="relative aspect-square bg-ink-100">
        {product.coverUrl ? (
          <Image
            src={product.coverUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 60vw, 240px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-300">
            <Package className="size-10" />
          </div>
        )}

        <span
          className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
          style={{ backgroundColor: available ? primaryColor : "#64748b" }}
        >
          {available ? "Disponível" : "Indisponível"}
        </span>
      </div>

      <div className="flex flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-ink-900">
          {product.name}
        </h3>
        <p className="text-xs text-ink-400">
          {product.code}
          {available ? ` · ${product.quantity} ${product.unit} em estoque` : ""}
        </p>
        <p className="text-lg font-bold" style={{ color: primaryColor }}>
          {formatBRL(product.priceCents)}
        </p>

        {whatsapp ? (
          <a
            href={whatsappLink(whatsapp, storeName, product)}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: accentColor }}
          >
            <MessageCircle className="size-3.5" />
            Pedir no WhatsApp
          </a>
        ) : null}
      </div>
    </article>
  );
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

  const coverByProduct = new Map<string, string>();
  for (const image of images) {
    if (!coverByProduct.has(image.productId)) {
      coverByProduct.set(image.productId, image.url);
    }
  }

  const withCover: CatalogProduct[] = catalog.map((product) => ({
    ...product,
    coverUrl: coverByProduct.get(product.id) ?? null,
  }));

  const groups = [
    ...categoryRows.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      items: withCover.filter((product) => product.categoryId === category.id),
    })),
    {
      id: "sem-categoria",
      name: "Outros produtos",
      description: null as string | null,
      items: withCover.filter((product) => !product.categoryId),
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
      <header
        className="sticky top-0 z-20 border-b border-black/5 backdrop-blur"
        style={{ backgroundColor: "rgba(255,255,255,0.9)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-3">
            {store.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={store.logoUrl}
                alt={store.name}
                className="size-10 rounded-xl object-contain"
              />
            ) : (
              <span
                className="flex size-10 items-center justify-center rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: store.primaryColor }}
              >
                {store.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <span className="font-bold tracking-tight text-ink-900">
              {store.name}
            </span>
          </div>

          {store.whatsapp ? (
            <a
              href={whatsappLink(store.whatsapp, store.name)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: store.primaryColor }}
            >
              <MessageCircle className="size-4" />
              Falar com a loja
            </a>
          ) : null}
        </div>
      </header>

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
                    <ProductCard
                      product={product}
                      primaryColor={store.primaryColor}
                      accentColor={store.accentColor}
                      whatsapp={store.whatsapp}
                      storeName={store.name}
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

      <footer className="mt-6">
        <div className="text-white" style={{ backgroundColor: store.secondaryColor }}>
          <div className="mx-auto grid max-w-6xl gap-6 px-5 py-10 sm:grid-cols-3">
            <div>
              <p className="font-bold">{store.name}</p>
              {store.address ? (
                <p className="mt-2 flex items-start gap-2 text-sm text-white/70">
                  <MapPin className="mt-0.5 size-4 shrink-0" />
                  {store.address}
                </p>
              ) : null}
            </div>
            <div className="space-y-2 text-sm text-white/70">
              {store.phone ? (
                <p className="flex items-center gap-2">
                  <Phone className="size-4" />
                  {store.phone}
                </p>
              ) : null}
              {store.email ? (
                <p className="flex items-center gap-2">
                  <MessageCircle className="size-4" />
                  {store.email}
                </p>
              ) : null}
            </div>
            <p className="text-sm text-white/50 sm:text-right">
              Catálogo atualizado automaticamente pelo estoque da loja.
            </p>
          </div>
        </div>

        {/*
          Créditos em faixa clara: o logotipo do Store77 é escuro e o da AUTORIC
          é azul, então nenhum dos dois tem contraste sobre o rodapé colorido
          da loja.
        */}
        <div className="border-t border-ink-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-4 text-xs text-ink-500 sm:flex-row">
            <Link
              href={PRODUCT.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 transition hover:text-ink-800"
            >
              <Image
                src="/logoname.png"
                alt="Store77"
                width={669}
                height={373}
                className="h-4 w-auto"
              />
              <span>Loja criada com Store77</span>
            </Link>

            <Link
              href={COMPANY.site}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 transition hover:text-ink-800"
            >
              <span>Desenvolvido por</span>
              <Image
                src="/logoDev.png"
                alt="AUTORIC — Automação e Sistemas"
                width={1160}
                height={323}
                className="h-4 w-auto"
              />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
