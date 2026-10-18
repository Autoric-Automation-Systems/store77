"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { financialEntries } from "@/db/schema";
import { requireAdminCapability } from "@/lib/auth";
import {
  fieldErrorsFrom,
  financialEntrySchema,
  formToObject,
  type ActionState,
} from "@/lib/validation";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function revalidateFinance() {
  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
}

/** Id vindo do formulário: só é aceito se for um UUID válido. */
function entryIdFrom(formData: FormData): string | null {
  const value = String(formData.get("id") ?? "").trim();
  return UUID_PATTERN.test(value) ? value : null;
}

export async function saveFinancialEntryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAdminCapability("manageFinance");

  const rawId = String(formData.get("id") ?? "").trim();
  const id = UUID_PATTERN.test(rawId) ? rawId : null;
  if (rawId && !id) {
    return { ok: false, message: "Lançamento não encontrado." };
  }

  const raw = formToObject(formData);
  // O select de forma de pagamento envia "" quando nada é escolhido, e o
  // schema espera o campo ausente nesse caso.
  if (raw.paymentMethod === "") raw.paymentMethod = undefined;

  const parsed = financialEntrySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verifique os campos destacados.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const data = parsed.data;
  const values = {
    kind: data.kind,
    description: data.description,
    category: data.category,
    amountCents: data.amountCents,
    dueDate: data.dueDate,
    paymentMethod: data.paymentMethod ?? null,
    notes: data.notes,
  };

  if (!id) {
    await db()
      .insert(financialEntries)
      .values({
        ...values,
        storeId: user.storeId,
        createdById: user.id,
        updatedAt: new Date(),
      });

    revalidateFinance();
    return { ok: true, message: "Lançamento criado." };
  }

  const [current] = await db()
    .select({ id: financialEntries.id })
    .from(financialEntries)
    .where(
      and(
        eq(financialEntries.id, id),
        eq(financialEntries.storeId, user.storeId),
      ),
    )
    .limit(1);

  if (!current) {
    return { ok: false, message: "Lançamento não encontrado." };
  }

  await db()
    .update(financialEntries)
    .set({ ...values, updatedAt: new Date() })
    .where(
      and(
        eq(financialEntries.id, id),
        eq(financialEntries.storeId, user.storeId),
      ),
    );

  revalidateFinance();
  return { ok: true, message: "Lançamento atualizado." };
}

export async function markPaidAction(formData: FormData): Promise<void> {
  const user = await requireAdminCapability("manageFinance");
  const id = entryIdFrom(formData);
  if (!id) return;

  // Só lançamentos pendentes são baixados; os demais ficam como estão.
  await db()
    .update(financialEntries)
    .set({ status: "PAGO", paidAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(financialEntries.id, id),
        eq(financialEntries.storeId, user.storeId),
        eq(financialEntries.status, "PENDENTE"),
      ),
    );

  revalidateFinance();
}

export async function reopenEntryAction(formData: FormData): Promise<void> {
  const user = await requireAdminCapability("manageFinance");
  const id = entryIdFrom(formData);
  if (!id) return;

  await db()
    .update(financialEntries)
    .set({ status: "PENDENTE", paidAt: null, updatedAt: new Date() })
    .where(
      and(
        eq(financialEntries.id, id),
        eq(financialEntries.storeId, user.storeId),
      ),
    );

  revalidateFinance();
}

export async function cancelEntryAction(formData: FormData): Promise<void> {
  const user = await requireAdminCapability("manageFinance");
  const id = entryIdFrom(formData);
  if (!id) return;

  await db()
    .update(financialEntries)
    .set({ status: "CANCELADO", updatedAt: new Date() })
    .where(
      and(
        eq(financialEntries.id, id),
        eq(financialEntries.storeId, user.storeId),
      ),
    );

  revalidateFinance();
}

export async function deleteFinancialEntryAction(
  formData: FormData,
): Promise<void> {
  const user = await requireAdminCapability("manageFinance");
  const id = entryIdFrom(formData);
  if (!id) return;

  await db()
    .delete(financialEntries)
    .where(
      and(
        eq(financialEntries.id, id),
        eq(financialEntries.storeId, user.storeId),
      ),
    );

  revalidateFinance();
}
