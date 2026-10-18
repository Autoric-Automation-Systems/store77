import Link from "next/link";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { invoices, stores, subscriptions, users } from "@/db/schema";
import { Badge, Card, CardHeader, PageHeader, Stat } from "@/components/ui";
import { ACCESS_LABELS, ACCESS_TONES, resolveAccess } from "@/lib/billing/access";
import {
  accessFromSubscription,
} from "@/lib/billing/entitlements";
import {
  addonsOf,
  findPlan,
  monthlyEquivalentCents,
  SEAT_ROLES,
} from "@/lib/billing/plans";
import { formatBRL, formatDate } from "@/lib/format";
import { requirePlatformAdmin } from "@/lib/platform";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; erro?: string }>;
}) {
  await requirePlatformAdmin();
  const { q = "" } = await searchParams;
  const term = q.trim().toLowerCase();

  const rows = await db()
    .select({ store: stores, subscription: subscriptions })
    .from(stores)
    .leftJoin(subscriptions, eq(subscriptions.storeId, stores.id))
    .orderBy(desc(stores.createdAt));

  const seatRows = await db()
    .select({
      storeId: users.storeId,
      count: sql<number>`count(*)::int`,
    })
    .from(users)
    .where(and(eq(users.active, true), inArray(users.role, [...SEAT_ROLES])))
    .groupBy(users.storeId);

  const seatsByStore = new Map(seatRows.map((row) => [row.storeId, row.count]));

  const [overdue] = await db()
    .select({
      count: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(${invoices.amountCents}), 0)::int`,
    })
    .from(invoices)
    .where(eq(invoices.status, "VENCIDA"));

  let mrrCents = 0;
  let trials = 0;
  let courtesy = 0;
  let blocked = 0;

  const enriched = rows.map(({ store, subscription }) => {
    const access = subscription
      ? accessFromSubscription(subscription)
      : resolveAccess({
          status: "ACTIVE",
          billingMode: "COMPLIMENTARY",
          grantType: "LEGACY",
          trialEndsAt: null,
          currentPeriodEnd: null,
          grantExpiresAt: null,
          revokedAt: null,
          cancelAtPeriodEnd: false,
          excludeFromMetrics: false,
        });
    const plan = subscription ? findPlan(subscription.planCode) : null;

    if (access.state === "TRIALING") trials += 1;
    if (access.state === "SUSPENDED" || access.state === "CANCELED") blocked += 1;
    if (subscription?.billingMode === "COMPLIMENTARY" && access.state === "ACTIVE") {
      courtesy += 1;
    }
    if (
      subscription &&
      subscription.billingMode === "PROVIDER" &&
      !subscription.excludeFromMetrics &&
      plan &&
      access.state !== "SUSPENDED" &&
      access.state !== "CANCELED"
    ) {
      mrrCents += monthlyEquivalentCents(
        plan,
        addonsOf(subscription),
        subscription.interval,
      );
    }

    return { store, subscription, access, plan };
  });

  const visible = term
    ? enriched.filter(
        (row) =>
          row.store.name.toLowerCase().includes(term) ||
          row.store.slug.toLowerCase().includes(term),
      )
    : enriched;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cobrança"
        description="Receita, teste, cortesias e pendências de todas as lojas."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="MRR estimado"
          value={formatBRL(mrrCents)}
          hint="Assinaturas pagas, fora cortesias"
          tone="success"
        />
        <Stat
          label="Lojas"
          value={String(rows.length)}
          hint={`${trials} em teste`}
          tone="neutral"
        />
        <Stat
          label="Cortesias ativas"
          value={String(courtesy)}
          hint="Inclui vitalícias e parcerias"
          tone="info"
        />
        <Stat
          label="Faturas vencidas"
          value={`${overdue?.count ?? 0}`}
          hint={formatBRL(overdue?.total ?? 0)}
          tone={(overdue?.count ?? 0) > 0 ? "danger" : "neutral"}
        />
      </div>

      <Card>
        <CardHeader
          title="Lojas"
          description={`${blocked} loja(s) suspensa(s) ou cancelada(s).`}
          action={
            <form className="flex items-center gap-2" action="/admin">
              <input
                className="input py-1.5"
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Nome ou slug"
              />
              <button className="btn btn-secondary px-3 py-1.5" type="submit">
                Buscar
              </button>
            </form>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-5 py-3 sm:px-6">Loja</th>
                <th className="px-3 py-3">Plano</th>
                <th className="px-3 py-3">Assentos</th>
                <th className="px-3 py-3">Estado</th>
                <th className="px-3 py-3">Vencimento</th>
                <th className="px-5 py-3 sm:px-6">Criada</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(({ store, subscription, access, plan }) => (
                <tr key={store.id} className="border-b border-ink-100 last:border-0">
                  <td className="px-5 py-3 sm:px-6">
                    <Link
                      href={`/admin/lojas/${store.id}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {store.name}
                    </Link>
                    <p className="text-xs text-ink-500">/{store.slug}</p>
                  </td>
                  <td className="px-3 py-3">
                    {plan?.name ?? "—"}
                    {subscription?.billingMode === "COMPLIMENTARY" ? (
                      <span className="ml-1 text-xs text-ink-500">cortesia</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    {seatsByStore.get(store.id) ?? 0}
                    {plan ? ` / ${plan.includedSeats + (subscription?.extraSeats ?? 0)}` : ""}
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone={ACCESS_TONES[access.state]}>
                      {ACCESS_LABELS[access.state]}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">{formatDate(access.periodEnd)}</td>
                  <td className="px-5 py-3 sm:px-6">{formatDate(store.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
