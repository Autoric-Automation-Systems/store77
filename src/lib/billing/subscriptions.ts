import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { confirmPayout, failPayout } from "@/lib/affiliate-payouts";
import {
  affiliateCommissions,
  affiliateReferrals,
  affiliates,
  invoices,
  sales,
  subscriptionEvents,
  subscriptions,
  users,
  type BillingInterval,
  type Subscription,
} from "@/db/schema";
import {
  BillingError,
  countActiveSeats,
  getStoreAccess,
  getSubscription,
} from "./entitlements";
import {
  COMMISSION_HOLD_DAYS,
  findPlan,
  periodTotalCents,
  PRICE_VERSION,
  TRIAL_DAYS,
  type PlanCode,
} from "./plans";
import type { ProviderEvent } from "./provider";

const DAY_MS = 24 * 60 * 60 * 1000;

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const targetMonth = result.getUTCMonth() + months;
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(targetMonth);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

function intervalMonths(interval: BillingInterval): number {
  return interval === "YEARLY" ? 12 : 1;
}

export async function recordSubscriptionEvent(input: {
  storeId: string;
  subscriptionId: string;
  type: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  actorUserId?: string | null;
  detail?: unknown;
}): Promise<void> {
  await db().insert(subscriptionEvents).values({
    storeId: input.storeId,
    subscriptionId: input.subscriptionId,
    type: input.type,
    fromStatus: input.fromStatus ?? null,
    toStatus: input.toStatus ?? null,
    actorUserId: input.actorUserId ?? null,
    detail: input.detail ?? null,
  });
}

/** Chamado no cadastro: toda loja nova começa no teste de 14 dias do Loja. */
export async function startTrial(
  storeId: string,
  planCode: PlanCode = "LOJA",
): Promise<void> {
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * DAY_MS);

  const [created] = await db()
    .insert(subscriptions)
    .values({
      storeId,
      planCode,
      priceVersion: PRICE_VERSION,
      status: "TRIALING",
      billingMode: "PROVIDER",
      interval: "MONTHLY",
      provider: "ASAAS",
      trialEndsAt,
      currentPeriodStart: now,
      currentPeriodEnd: trialEndsAt,
      grantType: "TRIAL",
    })
    .onConflictDoNothing()
    .returning({ id: subscriptions.id });

  if (created) {
    await recordSubscriptionEvent({
      storeId,
      subscriptionId: created.id,
      type: "trial_started",
      toStatus: "TRIALING",
      detail: { trialEndsAt, planCode },
    });
  }
}

/**
 * Concede cortesia. `expiresAt = null` vira vitalícia.
 * `excludeFromMetrics` separa uso interno (teste, suporte) de um presente real.
 */
export async function grantComplimentary(input: {
  storeId: string;
  planCode?: PlanCode;
  expiresAt?: Date | null;
  reason: string;
  actorUserId: string;
  grantType?: "GIFT" | "INTERNAL" | "PROMO" | "LEGACY";
  excludeFromMetrics?: boolean;
}): Promise<void> {
  const planCode = input.planCode ?? "CORTESIA";
  const plan = findPlan(planCode);
  if (!plan) throw new BillingError("Plano inexistente.");

  const existing = await getSubscription(input.storeId);
  const values = {
    planCode,
    priceVersion: PRICE_VERSION,
    status: "ACTIVE" as const,
    billingMode: "COMPLIMENTARY" as const,
    provider: "MANUAL" as const,
    providerCustomerId: null,
    providerSubscriptionId: null,
    trialEndsAt: null,
    currentPeriodStart: new Date(),
    currentPeriodEnd: null,
    grantType: input.grantType ?? "GIFT",
    grantExpiresAt: input.expiresAt ?? null,
    grantedByUserId: input.actorUserId,
    grantReason: input.reason,
    excludeFromMetrics: input.excludeFromMetrics ?? false,
    revokedAt: null,
    revokeReason: null,
    cancelAtPeriodEnd: false,
    canceledAt: null,
    updatedAt: new Date(),
  };

  if (existing) {
    await db()
      .update(subscriptions)
      .set(values)
      .where(eq(subscriptions.id, existing.id));
    await recordSubscriptionEvent({
      storeId: input.storeId,
      subscriptionId: existing.id,
      type: existing.billingMode === "COMPLIMENTARY" ? "grant_updated" : "grant_created",
      fromStatus: existing.status,
      toStatus: "ACTIVE",
      actorUserId: input.actorUserId,
      detail: {
        planCode,
        expiresAt: input.expiresAt ?? null,
        reason: input.reason,
        excludeFromMetrics: input.excludeFromMetrics ?? false,
      },
    });
    return;
  }

  const [created] = await db()
    .insert(subscriptions)
    .values({ storeId: input.storeId, ...values })
    .returning({ id: subscriptions.id });

  await recordSubscriptionEvent({
    storeId: input.storeId,
    subscriptionId: created.id,
    type: "grant_created",
    toStatus: "ACTIVE",
    actorUserId: input.actorUserId,
    detail: {
      planCode,
      expiresAt: input.expiresAt ?? null,
      reason: input.reason,
      excludeFromMetrics: input.excludeFromMetrics ?? false,
    },
  });
}

export async function revokeComplimentary(input: {
  storeId: string;
  reason: string;
  actorUserId: string;
}): Promise<void> {
  const existing = await getSubscription(input.storeId);
  if (!existing) throw new BillingError("A loja não tem assinatura.");

  await db()
    .update(subscriptions)
    .set({
      revokedAt: new Date(),
      revokeReason: input.reason,
      status: "SUSPENDED",
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, existing.id));

  await recordSubscriptionEvent({
    storeId: input.storeId,
    subscriptionId: existing.id,
    type: "grant_revoked",
    fromStatus: existing.status,
    toStatus: "SUSPENDED",
    actorUserId: input.actorUserId,
    detail: { reason: input.reason },
  });
}

/**
 * Troca de plano no meio do ciclo.
 *
 * Sem cobrança proporcional no MVP: o novo valor entra no próximo ciclo. O
 * gateway é atualizado agora para que a próxima fatura já saia com o valor
 * certo. Downgrade que deixaria assentos acima do limite é recusado.
 */
export async function changePlan(input: {
  storeId: string;
  planCode: PlanCode;
  interval: BillingInterval;
  actorUserId: string;
}): Promise<void> {
  const plan = findPlan(input.planCode);
  if (!plan || !plan.isPublic) throw new BillingError("Plano indisponível.");

  const subscription = await getSubscription(input.storeId);
  if (!subscription) throw new BillingError("A loja não tem assinatura.");

  // Assentos extras acompanham a troca, então contam para o limite do novo plano.
  const activeSeats = await countActiveSeats(input.storeId);
  const coveredSeats = plan.includedSeats + Math.max(0, subscription.extraSeats);
  if (coveredSeats < activeSeats) {
    throw new BillingError(
      `O plano ${plan.name} comporta ${coveredSeats} usuários ativos, e a loja tem ${activeSeats}. ` +
        "Desative alguém da equipe ou adicione assentos em Assinatura antes de mudar de plano.",
    );
  }

  const amount = periodTotalCents(
    plan,
    {
      extraSeats: subscription.extraSeats,
      extraStores: subscription.extraStores,
      extraSalesPacks: subscription.extraSalesPacks,
    },
    input.interval,
  );

  await db()
    .update(subscriptions)
    .set({
      planCode: plan.code,
      priceVersion: PRICE_VERSION,
      interval: input.interval,
      billingMode: "PROVIDER",
      grantType: "PAID",
      grantExpiresAt: null,
      revokedAt: null,
      revokeReason: null,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscription.id));

  await recordSubscriptionEvent({
    storeId: input.storeId,
    subscriptionId: subscription.id,
    type: "plan_changed",
    fromStatus: subscription.status,
    toStatus: subscription.status,
    actorUserId: input.actorUserId,
    detail: {
      from: subscription.planCode,
      to: plan.code,
      interval: input.interval,
      nextInvoiceCents: amount,
    },
  });
}

export async function cancelSubscription(input: {
  storeId: string;
  actorUserId: string;
}): Promise<void> {
  const subscription = await getSubscription(input.storeId);
  if (!subscription) throw new BillingError("A loja não tem assinatura.");

  const now = new Date();
  await db()
    .update(subscriptions)
    .set({
      status: "CANCELED",
      canceledAt: now,
      cancelAtPeriodEnd: true,
      updatedAt: now,
    })
    .where(eq(subscriptions.id, subscription.id));

  await recordSubscriptionEvent({
    storeId: input.storeId,
    subscriptionId: subscription.id,
    type: "subscription_canceled",
    fromStatus: subscription.status,
    toStatus: "CANCELED",
    actorUserId: input.actorUserId,
    detail: { accessUntil: subscription.currentPeriodEnd },
  });
}

/** Loja que paga depois de um atraso volta ao ciclo normal. */
async function reactivate(
  subscription: Subscription,
  paidAt: Date,
): Promise<void> {
  const periodStart = paidAt;
  const periodEnd = addMonths(paidAt, intervalMonths(subscription.interval));

  await db()
    .update(subscriptions)
    .set({
      status: "ACTIVE",
      billingMode: "PROVIDER",
      grantType: "PAID",
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      trialEndsAt: null,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscription.id));

  await recordSubscriptionEvent({
    storeId: subscription.storeId,
    subscriptionId: subscription.id,
    type: "payment_reactivated",
    fromStatus: subscription.status,
    toStatus: "ACTIVE",
    detail: { periodStart, periodEnd },
  });
}

async function findSubscriptionForEvent(event: {
  providerSubscriptionId: string | null;
  providerCustomerId: string | null;
  externalReference: string | null;
}): Promise<Subscription | null> {
  if (event.providerSubscriptionId) {
    const [row] = await db()
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.providerSubscriptionId, event.providerSubscriptionId))
      .limit(1);
    if (row) return row;
  }

  if (event.providerCustomerId) {
    const [row] = await db()
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.providerCustomerId, event.providerCustomerId))
      .limit(1);
    if (row) return row;
  }

  // Último recurso: o lojista que abriu o checkout mandou o id da loja.
  if (event.externalReference) {
    const [row] = await db()
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.storeId, event.externalReference))
      .limit(1);
    if (row) return row;
  }

  return null;
}

/**
 * Comissão só nasce de fatura paga, nunca de teste. A base é o valor pago; a
 * retenção de 30 dias cobre estorno e chargeback antes do saque.
 */
async function recordCommission(input: {
  storeId: string;
  invoiceId: string;
  paidAt: Date;
  baseAmountCents: number;
}): Promise<void> {
  const [referral] = await db()
    .select({
      affiliateId: affiliateReferrals.affiliateId,
      rateBp: affiliates.commissionRateBp,
      months: affiliates.commissionMonths,
      status: affiliates.status,
      excludeFromMetrics: subscriptions.excludeFromMetrics,
    })
    .from(affiliateReferrals)
    .innerJoin(affiliates, eq(affiliates.id, affiliateReferrals.affiliateId))
    .innerJoin(subscriptions, eq(subscriptions.storeId, affiliateReferrals.storeId))
    .where(eq(affiliateReferrals.storeId, input.storeId))
    .limit(1);

  if (!referral || referral.status !== "ATIVO") return;
  // Cortesia e uso interno não geram comissão nem contam para meta.
  if (referral.excludeFromMetrics) return;

  const [countRow] = await db()
    .select({ count: sql<number>`count(*)::int` })
    .from(affiliateCommissions)
    .where(
      and(
        eq(affiliateCommissions.affiliateId, referral.affiliateId),
        eq(affiliateCommissions.storeId, input.storeId),
      ),
    );

  if ((countRow?.count ?? 0) >= referral.months) return;

  const amountCents = Math.round(
    (input.baseAmountCents * referral.rateBp) / 10_000,
  );

  await db()
    .insert(affiliateCommissions)
    .values({
      affiliateId: referral.affiliateId,
      storeId: input.storeId,
      invoiceId: input.invoiceId,
      baseAmountCents: input.baseAmountCents,
      rateBp: referral.rateBp,
      amountCents,
      status: "PENDENTE",
      availableAt: new Date(input.paidAt.getTime() + COMMISSION_HOLD_DAYS * DAY_MS),
    })
    .onConflictDoNothing();

  await db()
    .update(affiliateReferrals)
    .set({
      // Data como texto: dentro de `sql` cru o driver não converte Date.
      convertedAt: sql`coalesce(${affiliateReferrals.convertedAt}, ${input.paidAt.toISOString()}::timestamptz)`,
    })
    .where(eq(affiliateReferrals.storeId, input.storeId));
}

async function applyInvoicePaid(event: Extract<ProviderEvent, { kind: "invoice.paid" }>) {
  const subscription = await findSubscriptionForEvent(event);
  if (!subscription) return;

  const plan = findPlan(subscription.planCode);
  const [invoice] = await db()
    .insert(invoices)
    .values({
      subscriptionId: subscription.id,
      storeId: subscription.storeId,
      provider: "ASAAS",
      providerInvoiceId: event.providerInvoiceId,
      status: "PAGA",
      description: `Assinatura ${plan?.name ?? subscription.planCode}`,
      amountCents: event.amountCents,
      billingType: event.billingType,
      dueDate: event.dueDate,
      paidAt: event.paidAt,
      invoiceUrl: event.invoiceUrl,
    })
    .onConflictDoUpdate({
      target: [invoices.provider, invoices.providerInvoiceId],
      set: {
        status: "PAGA",
        paidAt: event.paidAt,
        amountCents: event.amountCents,
        invoiceUrl: event.invoiceUrl,
        updatedAt: new Date(),
      },
    })
    .returning({ id: invoices.id, status: invoices.status });

  await reactivate(subscription, event.paidAt);

  if (invoice) {
    await recordCommission({
      storeId: subscription.storeId,
      invoiceId: invoice.id,
      paidAt: event.paidAt,
      baseAmountCents: event.amountCents,
    });
  }
}

async function applyInvoiceStatus(
  event: Extract<
    ProviderEvent,
    { kind: "invoice.overdue" | "invoice.refunded" | "invoice.canceled" }
  >,
) {
  const subscription = await findSubscriptionForEvent(event);
  if (!subscription) return;

  // Vencimento nunca rebaixa fatura já paga. Sem esta guarda, um
  // PAYMENT_OVERDUE entregue fora de ordem (ou reenviado depois do pagamento)
  // marcaria a loja como PAST_DUE e apagaria o PAGA da fatura.
  if (event.kind === "invoice.overdue") {
    const [paid] = await db()
      .select({ status: invoices.status })
      .from(invoices)
      .where(
        and(
          eq(invoices.provider, "ASAAS"),
          eq(invoices.providerInvoiceId, event.providerInvoiceId),
        ),
      )
      .limit(1);
    if (paid?.status === "PAGA") return;
  }

  const status =
    event.kind === "invoice.overdue"
      ? ("VENCIDA" as const)
      : event.kind === "invoice.refunded"
        ? ("ESTORNADA" as const)
        : ("CANCELADA" as const);

  await db()
    .insert(invoices)
    .values({
      subscriptionId: subscription.id,
      storeId: subscription.storeId,
      provider: "ASAAS",
      providerInvoiceId: event.providerInvoiceId,
      status,
      description: `Assinatura ${subscription.planCode}`,
      amountCents: event.amountCents,
      billingType: null,
      dueDate:
        event.kind === "invoice.overdue"
          ? event.dueDate
          : new Date().toISOString().slice(0, 10),
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
    })
    .onConflictDoUpdate({
      target: [invoices.provider, invoices.providerInvoiceId],
      set: { status, updatedAt: new Date() },
    });

  if (event.kind === "invoice.overdue") {
    await db()
      .update(subscriptions)
      .set({ status: "PAST_DUE", updatedAt: new Date() })
      .where(eq(subscriptions.id, subscription.id));
    await recordSubscriptionEvent({
      storeId: subscription.storeId,
      subscriptionId: subscription.id,
      type: "invoice_overdue",
      fromStatus: subscription.status,
      toStatus: "PAST_DUE",
      detail: { providerInvoiceId: event.providerInvoiceId },
    });
    return;
  }

  // Estorno devolve a comissão, mesmo que já esteja disponível.
  const [invoiceRow] = await db()
    .select({ id: invoices.id })
    .from(invoices)
    .where(
      and(
        eq(invoices.provider, "ASAAS"),
        eq(invoices.providerInvoiceId, event.providerInvoiceId),
      ),
    )
    .limit(1);

  if (invoiceRow) {
    await db()
      .update(affiliateCommissions)
      .set({ status: "ESTORNADO", updatedAt: new Date() })
      .where(eq(affiliateCommissions.invoiceId, invoiceRow.id));
  }
}

/** Aplica um evento já autenticado. Idempotência fica em `payment_events`. */
export async function applyProviderEvent(event: ProviderEvent): Promise<void> {
  switch (event.kind) {
    case "transfer.done":
      await confirmPayout({
        providerTransferId: event.providerTransferId,
        externalReference: event.externalReference,
      });
      return;
    case "transfer.failed":
      await failPayout({
        providerTransferId: event.providerTransferId,
        externalReference: event.externalReference,
        reason: "Transferência recusada ou cancelada pelo gateway.",
      });
      return;
    case "invoice.paid":
      await applyInvoicePaid(event);
      return;
    case "invoice.overdue":
    case "invoice.refunded":
    case "invoice.canceled":
      await applyInvoiceStatus(event);
      return;
    case "subscription.canceled": {
      const [row] = await db()
        .select()
        .from(subscriptions)
        .where(
          eq(subscriptions.providerSubscriptionId, event.providerSubscriptionId),
        )
        .limit(1);
      if (!row) return;
      await db()
        .update(subscriptions)
        .set({
          status: "CANCELED",
          cancelAtPeriodEnd: true,
          canceledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, row.id));
      await recordSubscriptionEvent({
        storeId: row.storeId,
        subscriptionId: row.id,
        type: "subscription_canceled",
        fromStatus: row.status,
        toStatus: "CANCELED",
      });
      return;
    }
  }
}

/** Atalho para telas: uso do mês e status em uma leitura só. */
export async function billingOverview(storeId: string) {
  return getStoreAccess(storeId);
}

/** Quantidade de vendas de uma loja, para métrica do painel interno. */
export async function salesCount(storeId: string): Promise<number> {
  const [row] = await db()
    .select({ count: sql<number>`count(*)::int` })
    .from(sales)
    .where(eq(sales.storeId, storeId));
  return row?.count ?? 0;
}

/** Quantidade de usuários ativos de uma loja, incluindo papéis que não ocupam assento. */
export async function activeUsersCount(storeId: string): Promise<number> {
  const [row] = await db()
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.storeId, storeId), eq(users.active, true)));
  return row?.count ?? 0;
}
