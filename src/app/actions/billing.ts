"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { stores, subscriptions } from "@/db/schema";
import { requireOwner } from "@/lib/auth";
import { asaas, AsaasError } from "@/lib/billing/asaas";
import {
  cancelSubscription,
  changePlan,
  recordSubscriptionEvent,
} from "@/lib/billing/subscriptions";
import { getStoreAccess } from "@/lib/billing/entitlements";
import {
  findPublicPlan,
  periodTotalCents,
  PRICE_VERSION,
  type PlanCode,
} from "@/lib/billing/plans";
import { todayISO } from "@/lib/format";

/**
 * Ações de cobrança. Todo valor é recalculado aqui a partir do catálogo: o
 * formulário manda código do plano e ciclo, nunca preço.
 */

function backWithError(message: string): never {
  redirect(`/assinatura?erro=${encodeURIComponent(message)}`);
}

function errorMessage(error: unknown): string {
  if (error instanceof AsaasError && error.status === 401) {
    return "O gateway recusou a credencial de cobrança. Fale com o suporte.";
  }
  console.error("Falha na cobrança", error);
  return "Não foi possível falar com o gateway de pagamento. Tente novamente em instantes.";
}

function parsePlanCode(value: FormDataEntryValue | null): PlanCode {
  const plan = findPublicPlan(String(value ?? ""));
  if (!plan) backWithError("Plano inválido.");
  return plan.code;
}

function parseInterval(value: FormDataEntryValue | null): "MONTHLY" | "YEARLY" {
  return value === "YEARLY" ? "YEARLY" : "MONTHLY";
}

export async function selectPlanAction(formData: FormData): Promise<void> {
  const user = await requireOwner();
  const planCode = parsePlanCode(formData.get("planCode"));
  const interval = parseInterval(formData.get("interval"));
  const plan = findPublicPlan(planCode)!;
  const overview = await getStoreAccess(user.storeId);

  if (!overview.access.capabilities.manageTeam) {
    backWithError(overview.access.reason);
  }

  const amountCents = periodTotalCents(
    plan,
    {
      extraSeats: overview.subscription?.extraSeats ?? 0,
      extraStores: overview.subscription?.extraStores ?? 0,
      extraSalesPacks: overview.subscription?.extraSalesPacks ?? 0,
    },
    interval,
  );

  // Assinatura ativa no gateway: só ajusta o valor. Vale no próximo ciclo, sem
  // cobrança proporcional e sem passar pelo checkout de novo.
  if (
    overview.subscription?.providerSubscriptionId &&
    overview.subscription.billingMode === "PROVIDER" &&
    overview.subscription.status !== "CANCELED"
  ) {
    try {
      await asaas().updateSubscriptionValue(
        overview.subscription.providerSubscriptionId,
        amountCents,
        interval,
      );
    } catch (error) {
      backWithError(errorMessage(error));
    }

    await changePlan({
      storeId: user.storeId,
      planCode,
      interval,
      actorUserId: user.id,
    });
    revalidatePath("/assinatura");
    redirect("/assinatura?ok=plano");
  }

  if (!asaas().isConfigured) {
    backWithError(
      "A contratação online ainda não está habilitada. Fale com o suporte para ativar seu plano.",
    );
  }

  const [store] = await db()
    .select({
      name: stores.name,
      legalName: stores.legalName,
      document: stores.document,
      email: stores.email,
    })
    .from(stores)
    .where(eq(stores.id, user.storeId))
    .limit(1);

  let checkout;
  try {
    checkout = await asaas().createCheckout({
      customer: {
        name: store?.legalName ?? store?.name ?? user.storeName,
        email: store?.email ?? user.email,
        document: store?.document,
        externalReference: user.storeId,
      },
      planCode: plan.code,
      planName: plan.name,
      interval,
      amountCents,
      nextDueDate: todayISO(),
      description: `Store77 · plano ${plan.name} (${interval === "YEARLY" ? "anual" : "mensal"})`,
      externalReference: user.storeId,
    });
  } catch (error) {
    backWithError(errorMessage(error));
  }

  const now = new Date();
  await db()
    .update(subscriptions)
    .set({
      planCode: plan.code,
      priceVersion: PRICE_VERSION,
      interval,
      provider: "ASAAS",
      billingMode: "PROVIDER",
      grantType: "PAID",
      grantExpiresAt: null,
      revokedAt: null,
      revokeReason: null,
      providerCustomerId: checkout.providerCustomerId,
      providerSubscriptionId: checkout.providerSubscriptionId,
      updatedAt: now,
    })
    .where(eq(subscriptions.storeId, user.storeId));

  if (overview.subscription) {
    await recordSubscriptionEvent({
      storeId: user.storeId,
      subscriptionId: overview.subscription.id,
      type: "checkout_started",
      fromStatus: overview.subscription.status,
      actorUserId: user.id,
      detail: { planCode, interval, amountCents },
    });
  }

  if (!checkout.checkoutUrl) {
    revalidatePath("/assinatura");
    redirect("/assinatura?ok=aguardando");
  }

  redirect(checkout.checkoutUrl);
}

export async function updateAddonsAction(formData: FormData): Promise<void> {
  const user = await requireOwner();
  const overview = await getStoreAccess(user.storeId);
  if (!overview.subscription) backWithError("A loja não tem assinatura.");

  const clamp = (value: FormDataEntryValue | null) =>
    Math.min(200, Math.max(0, Number.parseInt(String(value ?? "0"), 10) || 0));

  const extraSeats = clamp(formData.get("extraSeats"));
  const extraStores = clamp(formData.get("extraStores"));
  const extraSalesPacks = clamp(formData.get("extraSalesPacks"));

  const amountCents = periodTotalCents(
    overview.plan,
    { extraSeats, extraStores, extraSalesPacks },
    overview.subscription.interval,
  );

  if (
    overview.subscription.providerSubscriptionId &&
    overview.subscription.billingMode === "PROVIDER" &&
    asaas().isConfigured
  ) {
    try {
      await asaas().updateSubscriptionValue(
        overview.subscription.providerSubscriptionId,
        amountCents,
        overview.subscription.interval,
      );
    } catch (error) {
      backWithError(errorMessage(error));
    }
  }

  await db()
    .update(subscriptions)
    .set({ extraSeats, extraStores, extraSalesPacks, updatedAt: new Date() })
    .where(eq(subscriptions.storeId, user.storeId));

  await recordSubscriptionEvent({
    storeId: user.storeId,
    subscriptionId: overview.subscription.id,
    type: "addons_changed",
    fromStatus: overview.subscription.status,
    actorUserId: user.id,
    detail: { extraSeats, extraStores, extraSalesPacks, amountCents },
  });

  revalidatePath("/assinatura");
  redirect("/assinatura?ok=adicionais");
}

export async function cancelSubscriptionAction(): Promise<void> {
  const user = await requireOwner();
  const overview = await getStoreAccess(user.storeId);
  if (!overview.subscription) backWithError("A loja não tem assinatura.");

  if (overview.subscription.billingMode === "COMPLIMENTARY") {
    backWithError(
      "Cortesia é revogada pelo suporte, não pelo painel. Fale com a gente.",
    );
  }

  if (
    overview.subscription.providerSubscriptionId &&
    asaas().isConfigured
  ) {
    try {
      await asaas().cancelSubscription(
        overview.subscription.providerSubscriptionId,
      );
    } catch (error) {
      backWithError(errorMessage(error));
    }
  }

  await cancelSubscription({ storeId: user.storeId, actorUserId: user.id });
  revalidatePath("/assinatura");
  redirect("/assinatura?ok=cancelada");
}
