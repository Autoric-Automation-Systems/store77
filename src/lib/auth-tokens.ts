import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { authTokens, stores, users, type AuthTokenType } from "@/db/schema";

const TTL_MS: Record<AuthTokenType, number> = {
  SET_PASSWORD: 48 * 60 * 60 * 1000,
  RESET_PASSWORD: 60 * 60 * 1000,
};

const RESEND_COOLDOWN_MS = 60 * 1000;

export function hashAuthToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type IssuedToken = {
  token: string;
  type: AuthTokenType;
};

/**
 * Gera um token de uso único e invalida os anteriores do mesmo tipo. O valor em
 * claro só existe no link do e-mail; o banco guarda o hash SHA-256.
 */
export async function issueAuthToken({
  userId,
  type,
  skipCooldown = false,
}: {
  userId: string;
  type: AuthTokenType;
  skipCooldown?: boolean;
}): Promise<IssuedToken | null> {
  if (!skipCooldown) {
    const [latest] = await db()
      .select({ createdAt: authTokens.createdAt })
      .from(authTokens)
      .where(and(eq(authTokens.userId, userId), eq(authTokens.type, type)))
      .orderBy(desc(authTokens.createdAt))
      .limit(1);

    if (
      latest &&
      Date.now() - latest.createdAt.getTime() < RESEND_COOLDOWN_MS
    ) {
      return null;
    }
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashAuthToken(token);
  const expiresAt = new Date(Date.now() + TTL_MS[type]);

  await db().transaction(async (tx) => {
    await tx
      .delete(authTokens)
      .where(and(eq(authTokens.userId, userId), eq(authTokens.type, type)));
    await tx.insert(authTokens).values({ userId, type, tokenHash, expiresAt });
  });

  return { token, type };
}

export type PendingToken = {
  id: string;
  userId: string;
  type: AuthTokenType;
  email: string;
  name: string;
  storeName: string;
};

/** Metadados para montar a tela de definir senha sem revelar dados de outra conta. */
export async function findPendingAuthToken(
  token: string,
): Promise<PendingToken | null> {
  const [row] = await db()
    .select({
      id: authTokens.id,
      userId: authTokens.userId,
      type: authTokens.type,
      email: users.email,
      name: users.name,
      storeName: stores.name,
    })
    .from(authTokens)
    .innerJoin(users, eq(users.id, authTokens.userId))
    .innerJoin(stores, eq(stores.id, users.storeId))
    .where(
      and(
        eq(authTokens.tokenHash, hashAuthToken(token)),
        isNull(authTokens.usedAt),
        gt(authTokens.expiresAt, new Date()),
        eq(users.active, true),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function setPasswordWithToken(
  token: string,
  passwordHash: string,
): Promise<{ userId: string; type: AuthTokenType } | null> {
  const now = new Date();

  return db().transaction(async (tx) => {
    const [row] = await tx
      .update(authTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(authTokens.tokenHash, hashAuthToken(token)),
          isNull(authTokens.usedAt),
          gt(authTokens.expiresAt, now),
        ),
      )
      .returning({ userId: authTokens.userId, type: authTokens.type });

    if (!row) return null;

    const [updated] = await tx
      .update(users)
      .set({ passwordHash, emailVerifiedAt: now, updatedAt: now })
      .where(and(eq(users.id, row.userId), eq(users.active, true)))
      .returning({ id: users.id });

    if (!updated) return null;

    // Um link novo invalida qualquer outro pendente da mesma pessoa.
    await tx.delete(authTokens).where(eq(authTokens.userId, row.userId));

    return row;
  });
}
