import { and, desc, eq, gte, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  invoices,
  sales,
  subscriptions,
  users,
  type Subscription,
} from "@/db/schema";
import { resolveAccess, type Access, type Capabilities } from "./access";
import {
  findPlan,
  limitsFor,
  NO_ADDONS,
  SEAT_ROLES,
  type Plan,
  type PlanLimits,
} from "./plans";

/**
 * Camada que junta assinatura + catálogo + uso. Só roda no servidor.
 *
 * Regra de segurança: nenhuma página ou action pode confiar no plano que veio
 * do formulário. Sempre leia a assinatura da loja logada aqui.
 */

export type BillingOverview = {
  subscription: Subscription | null;
  plan: Plan;
  limits: PlanLimits;
  access: Access;
  seatsUsed: number;
  salesThisMonth: number;
  invoices: (typeof invoices.$inferSelect)[];
  /** Assinatura ausente = loja anterior à cobrança; acesso liberado por segurança. */
  isFallback: boolean;
};

function fallbackPlan(): Plan {
  return findPlan("LEGACY") ?? findPlan("EQUIPE")!;
}

export async function getSubscription(
  storeId: string,
): Promise<Subscription | null> {
  const [row] = await db()
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.storeId, storeId))
    .limit(1);
  return row ?? null;
}

export function accessFromSubscription(subscription: Subscription): Access {
  return resolveAccess({
    status: subscription.status,
    billingMode: subscription.billingMode,
    grantType: subscription.grantType,
    trialEndsAt: subscription.trialEndsAt,
    currentPeriodEnd: subscription.currentPeriodEnd,
    grantExpiresAt: subscription.grantExpiresAt,
    revokedAt: subscription.revokedAt,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    excludeFromMetrics: subscription.excludeFromMetrics,
  });
}

export async function countActiveSeats(storeId: string): Promise<number> {
  const [row] = await db()
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(
      and(
        eq(users.storeId, storeId),
        eq(users.active, true),
        inArray(users.role, [...SEAT_ROLES]),
      ),
    );
  return row?.count ?? 0;
}

export function monthStart(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Vendas do mês são contadas na leitura, não em contador incremental: um
 * contador pode divergir por venda cancelada, importação ou falha no meio do
 * caminho, e o número precisa ser o mesmo que o lojista vê em Vendas.
 */
export async function countSalesThisMonth(
  storeId: string,
  now: Date = new Date(),
): Promise<number> {
  const [row] = await db()
    .select({ count: sql<number>`count(*)::int` })
    .from(sales)
    .where(
      and(
        eq(sales.storeId, storeId),
        gte(sales.createdAt, monthStart(now)),
        ne(sales.status, "CANCELADA"),
      ),
    );
  return row?.count ?? 0;
}

export async function getStoreAccess(storeId: string): Promise<BillingOverview> {
  const subscription = await getSubscription(storeId);
  const plan = subscription ? findPlan(subscription.planCode) : null;
  const addons = subscription
    ? {
        extraSeats: subscription.extraSeats,
        extraStores: subscription.extraStores,
        extraSalesPacks: subscription.extraSalesPacks,
      }
    : NO_ADDONS;
  const effectivePlan = plan ?? fallbackPlan();
  const [seatsUsed, salesThisMonth, invoiceRows] = await Promise.all([
    countActiveSeats(storeId),
    countSalesThisMonth(storeId),
    subscription
      ? db()
          .select()
          .from(invoices)
          .where(eq(invoices.subscriptionId, subscription.id))
          .orderBy(desc(invoices.dueDate))
          .limit(12)
      : Promise.resolve([]),
  ]);

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

  return {
    subscription,
    plan: effectivePlan,
    limits: limitsFor(effectivePlan, addons),
    access,
    seatsUsed,
    salesThisMonth,
    invoices: invoiceRows,
    isFallback: !subscription,
  };
}

export class BillingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillingError";
  }
}

/** Bloqueia uma escrita quando o estado de cobrança não permite. */
export function requireCapability(
  overview: BillingOverview,
  capability: keyof Capabilities,
): void {
  if (!overview.access.capabilities[capability]) {
    throw new BillingError(overview.access.reason);
  }
}

export async function requireStoreCapability(
  storeId: string,
  capability: keyof Capabilities,
): Promise<void> {
  requireCapability(await getStoreAccess(storeId), capability);
}

/** Usado antes de convidar: o convite não pode criar assento acima do plano. */
export async function assertSeatAvailable(storeId: string): Promise<void> {
  const overview = await getStoreAccess(storeId);
  if (!overview.access.capabilities.inviteUsers) {
    throw new BillingError(overview.access.reason);
  }
  if (overview.seatsUsed >= overview.limits.seats) {
    throw new BillingError(
      `O plano ${overview.plan.name} inclui ${overview.limits.seats} usuários ativos. ` +
        "Desative alguém da equipe ou adicione assentos em Assinatura.",
    );
  }
}
