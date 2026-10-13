"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { requireAdmin, requireUser } from "@/lib/auth";
import {
  customerSchema,
  fieldErrorsFrom,
  formToObject,
  type ActionState,
} from "@/lib/validation";

function revalidateCustomers() {
  revalidatePath("/clientes");
  revalidatePath("/caixa");
}

export async function saveCustomerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = customerSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verifique os campos destacados.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const data = parsed.data;
  const values = {
    name: data.name,
    email: data.email,
    phone: data.phone,
    document: data.document,
    address: data.address,
    notes: data.notes,
    updatedAt: new Date(),
  };

  if (data.id) {
    const [existing] = await db()
      .select({ id: customers.id })
      .from(customers)
      .where(
        and(eq(customers.id, data.id), eq(customers.storeId, user.storeId)),
      )
      .limit(1);

    if (!existing) return { ok: false, message: "Cliente não encontrado." };

    await db()
      .update(customers)
      .set(values)
      .where(
        and(eq(customers.id, data.id), eq(customers.storeId, user.storeId)),
      );

    revalidateCustomers();
    return { ok: true, message: "Cliente atualizado." };
  }

  await db().insert(customers).values({ storeId: user.storeId, ...values });

  revalidateCustomers();
  return { ok: true, message: `Cliente ${data.name} cadastrado.` };
}

export async function deleteCustomerAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // Vendas e lançamentos financeiros mantêm o histórico: a referência vira nula.
  await db()
    .delete(customers)
    .where(and(eq(customers.id, id), eq(customers.storeId, user.storeId)));

  revalidateCustomers();
}
