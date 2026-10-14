import { and, asc, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { Globe2 } from "lucide-react";
import { db } from "@/db";
import { categories, products, stores } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { Card, CardHeader, EmptyState, PageHeader, Stat } from "@/components/ui";
import { StoreSettingsForm } from "./store-settings-form";

export const metadata = { title: "Vitrine online" };

export default async function VitrinePage() {
  const user = await requireAdmin();

  const [store] = await db()
    .select()
    .from(stores)
    .where(eq(stores.id, user.storeId))
    .limit(1);

  if (!store) {
    return (
      <EmptyState
        title="Loja não encontrada"
        description="Sua sessão aponta para uma loja que não existe mais."
      />
    );
  }

  const [catalog, categoryRows, requestHeaders] = await Promise.all([
    db()
      .select({
        published: sql<number>`count(*) filter (where ${products.quantity} > 0)::int`,
        total: sql<number>`count(*)::int`,
        withPhoto: sql<number>`count(*) filter (where exists (
          select 1 from product_images pi where pi.product_id = ${products.id}
        ))::int`,
      })
      .from(products)
      .where(and(eq(products.storeId, user.storeId), eq(products.active, true))),

    db()
      .select({ name: categories.name })
      .from(categories)
      .where(eq(categories.storeId, user.storeId))
      .orderBy(asc(categories.name)),

    headers(),
  ]);

  const stats = catalog[0] ?? { published: 0, total: 0, withPhoto: 0 };
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") || host.startsWith("127.")
    ? "http"
    : "https";
  const publicPath = `/loja/${store.slug}`;

  return (
    <>
      <PageHeader
        title="Vitrine online"
        description="Sua landing page é gerada automaticamente a partir do estoque real."
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat
          label="Produtos publicados"
          value={String(stats.published)}
          hint={`de ${stats.total} ativos`}
          tone={stats.published > 0 ? "success" : "warning"}
        />
        <Stat label="Produtos com foto" value={String(stats.withPhoto)} />
        <Stat label="Categorias" value={String(categoryRows.length)} />
      </div>

      <Card>
        <CardHeader
          title="Endereço público"
          description="Divulgue este link nas redes sociais e no WhatsApp."
        />
        <div className="card-pad space-y-2">
          <code className="block overflow-x-auto rounded-xl bg-ink-900 px-4 py-3 text-sm text-ink-100">
            {protocol}://{host}
            {publicPath}
          </code>
          <p className="text-sm text-ink-500">
            {store.isPublic ? (
              <span className="flex items-center gap-2">
                <Globe2 className="size-4 text-emerald-500" />
                Vitrine publicada.
              </span>
            ) : (
              <span className="text-amber-700">
                Vitrine despublicada: apenas você vê o conteúdo.
              </span>
            )}
          </p>
        </div>
      </Card>

      <StoreSettingsForm
        publicPath={publicPath}
        store={{
          name: store.name,
          slug: store.slug,
          whatsapp: store.whatsapp,
          phone: store.phone,
          email: store.email,
          address: store.address,
          logoUrl: store.logoUrl,
          heroTitle: store.heroTitle,
          heroSubtitle: store.heroSubtitle,
          heroImageUrl: store.heroImageUrl,
          aboutText: store.aboutText,
          primaryColor: store.primaryColor,
          secondaryColor: store.secondaryColor,
          accentColor: store.accentColor,
          isPublic: store.isPublic,
          showOutOfStock: store.showOutOfStock,
        }}
      />
    </>
  );
}
