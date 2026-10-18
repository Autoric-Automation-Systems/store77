"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/platform";
import { findPlan, type PlanCode } from "@/lib/billing/plans";
import {
  addMonths,
  changePlan,
  grantComplimentary,
  recordSubscriptionEvent,
  revokeComplimentary,
} from "@/lib/billing/subscriptions";

/**
 * Ações do painel interno. Toda concessão guarda autor, motivo e data: cortesia
 * sem trilha vira prejuízo invisível.
 */

function backTo(storeId: string, message: string): never {
  redirect(`/admin/lojas/${storeId}?erro=${encodeURIComponent(message)}`);
}

function readStoreId(formData: FormData): string {
  const storeId = String(formData.get("storeId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(storeId)) {
    redirect("/admin/lojas?erro=loja-invalida");
  }
  return storeId;
}

export async function grantAction(formData: FormData): Promise<void> {
  const admin = await requirePlatformAdmin();
  const storeId = readStoreId(formData);

  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 3) backTo(storeId, "Descreva o motivo da concessão.");

  const planCode = (String(formData.get("planCode") ?? "CORTESIA") ||
    "CORTESIA") as PlanCode;
  if (!findPlan(planCode)) backTo(storeId, "Plano inválido.");

  const mode = String(formData.get("mode") ?? "lifetime");
  const months = Math.min(
    120,
    Math.max(1, Number.parseInt(String(formData.get("months") ?? "12"), 10) || 12),
  );

  const expiresAt = mode === "lifetime" ? null : addMonths(new Date(), months);

  await grantComplimentary({
    storeId,
    planCode,
    expiresAt,
    reason,
    actorUserId: admin.id,
    grantType: mode === "lifetime" ? "GIFT" : "PROMO",
    excludeFromMetrics: formData.get("excludeFromMetrics") === "on",
  });

  revalidatePath("/admin/lojas");
  revalidatePath("/admin");
  revalidatePath(`/admin/lojas/${storeId}`);
  revalidatePath("/assinatura");
  redirect(`/admin/lojas/${storeId}?ok=cortesia`);
}

export async function revokeAction(formData: FormData): Promise<void> {
  const admin = await requirePlatformAdmin();
  const storeId = readStoreId(formData);
  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 3) backTo(storeId, "Descreva o motivo da revogação.");

  await revokeComplimentary({ storeId, reason, actorUserId: admin.id });

  revalidatePath("/admin/lojas");
  revalidatePath("/admin");
  revalidatePath(`/admin/lojas/${storeId}`);
  revalidatePath("/assinatura");
  redirect(`/admin/lojas/${storeId}?ok=revogada`);
}

/**
 * Troca de plano sem cobrança, para suporte. Não cria assinatura no gateway:
 * quando a loja for pagar, o fluxo normal de checkout assume.
 */
export async function setPlanAction(formData: FormData): Promise<void> {
  const admin = await requirePlatformAdmin();
  const storeId = readStoreId(formData);
  const planCode = String(formData.get("planCode") ?? "") as PlanCode;
  const plan = findPlan(planCode);
  if (!plan || !plan.isPublic) backTo(storeId, "Plano inválido.");

  try {
    await changePlan({
      storeId,
      planCode,
      interval: "MONTHLY",
      actorUserId: admin.id,
    });
  } catch (error) {
    backTo(storeId, error instanceof Error ? error.message : "Falha ao trocar o plano.");
  }

  revalidatePath(`/admin/lojas/${storeId}`);
  redirect(`/admin/lojas/${storeId}?ok=plano`);
}

/**
 * Marca uma loja como fora dos indicadores (teste interno, demonstração).
 * Não muda o acesso: só tira do MRR, do churn e das comissões.
 */
export async function toggleMetricsAction(formData: FormData): Promise<void> {
  const admin = await requirePlatformAdmin();
  const storeId = readStoreId(formData);

  const [subscription] = await db()
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.storeId, storeId))
    .limit(1);
  if (!subscription) backTo(storeId, "A loja não tem assinatura.");

  const next = !subscription.excludeFromMetrics;
  await db()
    .update(subscriptions)
    .set({ excludeFromMetrics: next, updatedAt: new Date() })
    .where(eq(subscriptions.id, subscription.id));

  await recordSubscriptionEvent({
    storeId,
    subscriptionId: subscription.id,
    type: next ? "metrics_excluded" : "metrics_included",
    actorUserId: admin.id,
  });

  revalidatePath(`/admin/lojas/${storeId}`);
  redirect(`/admin/lojas/${storeId}?ok=indicadores`);
}
