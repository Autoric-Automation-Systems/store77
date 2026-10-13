"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { isReservedSlug } from "@/lib/slug";
import {
  fieldErrorsFrom,
  formToObject,
  storeSettingsSchema,
  type ActionState,
} from "@/lib/validation";

export async function saveStoreSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAdmin();

  const parsed = storeSettingsSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verifique os campos destacados.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const data = parsed.data;

  if (isReservedSlug(data.slug)) {
    return {
      ok: false,
      message: "Este link é reservado pelo sistema.",
      fieldErrors: { slug: "Escolha outro link" },
    };
  }

  const [conflict] = await db()
    .select({ id: stores.id })
    .from(stores)
    .where(and(eq(stores.slug, data.slug), ne(stores.id, user.storeId)))
    .limit(1);

  if (conflict) {
    return {
      ok: false,
      message: "Este link já está em uso por outra loja.",
      fieldErrors: { slug: "Link indisponível" },
    };
  }

  await db()
    .update(stores)
    .set({
      name: data.name,
      slug: data.slug,
      whatsapp: data.whatsapp,
      phone: data.phone,
      email: data.email,
      address: data.address,
      logoUrl: data.logoUrl,
      heroTitle: data.heroTitle,
      heroSubtitle: data.heroSubtitle,
      heroImageUrl: data.heroImageUrl,
      aboutText: data.aboutText,
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      accentColor: data.accentColor,
      isPublic: data.isPublic,
      showOutOfStock: data.showOutOfStock,
      updatedAt: new Date(),
    })
    .where(eq(stores.id, user.storeId));

  revalidatePath("/vitrine");
  revalidatePath("/dashboard");
  revalidatePath(`/loja/${data.slug}`);

  return { ok: true, message: "Vitrine atualizada. O novo link já está no ar." };
}
