import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { stores, users } from "@/db/schema";
import { isAdminRole, canManageStock } from "./roles";
import type { SessionUser } from "./roles";
import {
  BillingError,
  requireStoreCapability,
} from "./billing/entitlements";
import type { Capabilities } from "./billing/access";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  signSessionToken,
  verifySessionToken,
} from "./session-token";

export type { SessionUser } from "./roles";
export { ROLE_LABELS, isAdminRole, canManageStock } from "./roles";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionCookie(userId: string): Promise<void> {
  const token = await signSessionToken(userId);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function destroySessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const userId = await verifySessionToken(token);
  if (!userId) return null;

  const [row] = await db()
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      active: users.active,
      storeId: stores.id,
      storeName: stores.name,
      storeSlug: stores.slug,
    })
    .from(users)
    .innerJoin(stores, eq(stores.id, users.storeId))
    .where(eq(users.id, userId))
    .limit(1);

  if (!row || !row.active) return null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    storeId: row.storeId,
    storeName: row.storeName,
    storeSlug: row.storeSlug,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isAdminRole(user.role)) redirect("/dashboard");
  return user;
}

/**
 * Só o proprietário contrata, troca plano ou cancela. Gerente administra a
 * loja, não o contrato: evita que um gerente gere cobrança sem o dono saber.
 */
export async function requireOwner(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "OWNER") redirect("/assinatura?semPermissao=1");
  return user;
}

/** Operador de caixa vende, mas não mexe em saldo de estoque. */
export async function requireStockManager(): Promise<SessionUser> {
  const user = await requireUser();
  if (!canManageStock(user.role)) redirect("/estoque");
  try {
    await requireStoreCapability(user.storeId, "writeStock");
  } catch (error) {
    if (error instanceof BillingError) {
      redirect("/assinatura?bloqueio=1");
    }
    throw error;
  }
  return user;
}

/**
 * Papel administrativo + permissão de cobrança. Uma loja restrita continua
 * vendendo, mas não altera catálogo, financeiro, vitrine ou equipe.
 */
export async function requireAdminCapability(
  capability: keyof Capabilities,
): Promise<SessionUser> {
  const user = await requireAdmin();
  try {
    await requireStoreCapability(user.storeId, capability);
  } catch (error) {
    if (error instanceof BillingError) {
      redirect("/assinatura?bloqueio=1");
    }
    throw error;
  }
  return user;
}
