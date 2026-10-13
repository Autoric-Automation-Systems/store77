"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/slug";
import {
  categorySchema,
  fieldErrorsFrom,
  formToObject,
  type ActionState,
} from "@/lib/validation";

function revalidateCatalog() {
  revalidatePath("/estoque");
  revalidatePath("/estoque/categorias");
  revalidatePath("/vitrine");
}

export async function saveCategoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAdmin();

  const parsed = categorySchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verifique os campos destacados.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const { id, name, kind, description } = parsed.data;
  const slug = slugify(name);

  if (!slug) {
    return {
      ok: false,
      message: "Nome inválido.",
      fieldErrors: { name: "Use letras ou números" },
    };
  }

  const [conflict] = await db()
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.storeId, user.storeId), eq(categories.slug, slug)))
    .limit(1);

  if (conflict && conflict.id !== id) {
    return {
      ok: false,
      message: "Já existe um tipo/nicho com este nome.",
      fieldErrors: { name: "Nome já utilizado" },
    };
  }

  if (id) {
    await db()
      .update(categories)
      .set({ name, slug, kind, description, updatedAt: new Date() })
      .where(and(eq(categories.id, id), eq(categories.storeId, user.storeId)));
  } else {
    await db()
      .insert(categories)
      .values({ storeId: user.storeId, name, slug, kind, description });
  }

  revalidateCatalog();
  return { ok: true, message: id ? "Tipo atualizado." : "Tipo criado." };
}

export async function deleteCategoryAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // Produtos vinculados ficam sem categoria (FK com ON DELETE SET NULL).
  await db()
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.storeId, user.storeId)));

  revalidateCatalog();
}
