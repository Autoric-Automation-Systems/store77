"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { affiliates } from "@/db/schema";
import { isUniqueViolation } from "@/lib/db-errors";
import { generateAffiliateCode, purgeStaleAffiliates } from "@/lib/affiliates";
import { requirePlatformAdmin } from "@/lib/platform";

/** Valida o id vindo do formulário antes de qualquer query. */
function readAffiliateId(formData: FormData): string {
  const id = String(formData.get("affiliateId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/admin/afiliados?erro=id");
  return id;
}

export async function setAffiliateStatusAction(formData: FormData): Promise<void> {
  await requirePlatformAdmin();
  const affiliateId = readAffiliateId(formData);
  const status = String(formData.get("status") ?? "");

  if (!["ATIVO", "SUSPENSO", "RECUSADO"].includes(status)) {
    redirect(`/admin/afiliados/${affiliateId}?erro=status`);
  }

  await db()
    .update(affiliates)
    .set({
      status: status as "ATIVO" | "SUSPENSO" | "RECUSADO",
      approvedAt: status === "ATIVO" ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .where(eq(affiliates.id, affiliateId));

  revalidatePath("/admin/afiliados");
  revalidatePath(`/admin/afiliados/${affiliateId}`);
  redirect(`/admin/afiliados/${affiliateId}?ok=status`);
}

/**
 * Troca um código longo (derivado do nome) por um curto. O link antigo deixa de
 * funcionar, então a troca é manual e o painel avisa antes.
 */
export async function regenerateAffiliateCodeAction(
  formData: FormData,
): Promise<void> {
  await requirePlatformAdmin();
  const affiliateId = readAffiliateId(formData);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await db()
        .update(affiliates)
        .set({ code: await generateAffiliateCode(), updatedAt: new Date() })
        .where(eq(affiliates.id, affiliateId));
      break;
    } catch (error) {
      if (!isUniqueViolation(error, "affiliates_code_key")) throw error;
    }
  }

  revalidatePath("/admin/afiliados");
  revalidatePath(`/admin/afiliados/${affiliateId}`);
  redirect(`/admin/afiliados/${affiliateId}?ok=codigo`);
}

/**
 * Remove cadastros com mais de 6 meses e nenhuma indicação. A ação é manual e
 * confirma a lista antes: apagar em lote sem revisão é irreversível.
 */
export async function purgeStaleAffiliatesAction(): Promise<void> {
  await requirePlatformAdmin();
  const removed = await purgeStaleAffiliates();

  revalidatePath("/admin/afiliados");
  redirect(`/admin/afiliados?removidos=${removed}`);
}
