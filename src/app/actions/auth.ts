"use server";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { categories, stores, users } from "@/db/schema";
import {
  createSessionCookie,
  destroySessionCookie,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { isReservedSlug, slugify } from "@/lib/slug";
import {
  fieldErrorsFrom,
  formToObject,
  loginSchema,
  registerSchema,
  type ActionState,
} from "@/lib/validation";

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || "loja";
  let candidate = isReservedSlug(root) ? `${root}-loja` : root;

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const [existing] = await db()
      .select({ id: stores.id })
      .from(stores)
      .where(eq(stores.slug, candidate))
      .limit(1);
    if (!existing) return candidate;
    candidate = `${root}-${Math.random().toString(36).slice(2, 6)}`;
  }

  return `${root}-${Date.now().toString(36)}`;
}

export async function registerStoreAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = registerSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verifique os campos destacados.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const { storeName, name, email, password } = parsed.data;

  const [existing] = await db()
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);

  if (existing) {
    return {
      ok: false,
      message: "Este e-mail já está cadastrado.",
      fieldErrors: { email: "E-mail já cadastrado" },
    };
  }

  const slug = await uniqueSlug(storeName);
  const passwordHash = await hashPassword(password);

  const [store] = await db()
    .insert(stores)
    .values({
      name: storeName,
      slug,
      email,
      heroTitle: storeName,
      heroSubtitle: "Confira nossos produtos disponíveis em estoque.",
    })
    .returning({ id: stores.id });

  await db()
    .insert(categories)
    .values([{ storeId: store.id, name: "Geral", slug: "geral", kind: "TIPO" }]);

  const [owner] = await db()
    .insert(users)
    .values({
      storeId: store.id,
      name,
      email,
      passwordHash,
      role: "OWNER",
    })
    .returning({ id: users.id });

  await createSessionCookie(owner.id);
  redirect("/dashboard");
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verifique os campos destacados.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const { email, password } = parsed.data;

  const [user] = await db()
    .select({
      id: users.id,
      passwordHash: users.passwordHash,
      active: users.active,
    })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);

  // Mesma mensagem para usuário inexistente e senha errada: evita enumeração.
  const invalid: ActionState = {
    ok: false,
    message: "E-mail ou senha inválidos.",
  };

  if (!user || !user.active) return invalid;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return invalid;

  await createSessionCookie(user.id);

  const next = formData.get("next");
  const target =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/dashboard";

  redirect(target);
}

export async function logoutAction(): Promise<void> {
  await destroySessionCookie();
  redirect("/login");
}
