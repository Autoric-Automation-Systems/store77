import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  invoices,
  stores,
  subscriptions,
  users,
  type Store,
  type Subscription,
} from "@/db/schema";
import { resolveAccess, type Access } from "@/lib/billing/access";
import { accessFromSubscription } from "@/lib/billing/entitlements";
import {
  addonsOf,
  findPlan,
  monthlyEquivalentCents,
  SEAT_ROLES,
  type Plan,
} from "@/lib/billing/plans";

/**
 * Uma linha da visão de plataforma: a loja, a assinatura e o estado de acesso
 * já derivado. As telas de admin não recalculam acesso nem plano por conta
 * própria, senão cada uma passa a discordar da outra.
 */
export type AdminStoreRow = {
  store: Store;
  subscription: Subscription | null;
  access: Access;
  plan: Plan | null;
  seats: number;
};

export async function adminStoreRows(): Promise<AdminStoreRow[]> {
  const rows = await db()
    .select({ store: stores, subscription: subscriptions })
    .from(stores)
    .leftJoin(subscriptions, eq(subscriptions.storeId, stores.id))
    .orderBy(desc(stores.createdAt));

  const seatRows = await db()
    .select({ storeId: users.storeId, count: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.active, true), inArray(users.role, [...SEAT_ROLES])))
    .groupBy(users.storeId);

  const seatsByStore = new Map(seatRows.map((row) => [row.storeId, row.count]));

  return rows.map(({ store, subscription }) => ({
    store,
    subscription,
    // Loja sem assinatura foi criada antes da cobrança: tratamos como legado.
    access: subscription
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
        }),
    plan: subscription ? findPlan(subscription.planCode) : null,
    seats: seatsByStore.get(store.id) ?? 0,
  }));
}

export type PlatformMetrics = {
  mrrCents: number;
  storeCount: number;
  trials: number;
  courtesy: number;
  blocked: number;
  active: number;
  overdueCount: number;
  overdueCents: number;
};

export async function platformMetrics(
  rows: AdminStoreRow[],
): Promise<PlatformMetrics> {
  let mrrCents = 0;
  let trials = 0;
  let courtesy = 0;
  let blocked = 0;
  let active = 0;

  for (const { subscription, access, plan } of rows) {
    if (access.state === "TRIALING") trials += 1;
    if (access.state === "SUSPENDED" || access.state === "CANCELED") {
      blocked += 1;
    } else {
      active += 1;
    }
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
  }

  const [overdue] = await db()
    .select({
      count: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(${invoices.amountCents}), 0)::int`,
    })
    .from(invoices)
    .where(eq(invoices.status, "VENCIDA"));

  return {
    mrrCents,
    storeCount: rows.length,
    trials,
    courtesy,
    blocked,
    active,
    overdueCount: overdue?.count ?? 0,
    overdueCents: overdue?.total ?? 0,
  };
}
