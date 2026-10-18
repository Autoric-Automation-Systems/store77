"use server";

import { and, eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { categories, stores, users, type AuthTokenType } from "@/db/schema";
import {
  createSessionCookie,
  destroySessionCookie,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { sendPasswordEmail } from "@/lib/auth-emails";
import { startTrial } from "@/lib/billing/subscriptions";
import {
  findPendingAuthToken,
  issueAuthToken,
  setPasswordWithToken,
} from "@/lib/auth-tokens";
import {
  attributeReferral,
  findActiveAffiliateByCode,
} from "@/lib/affiliates";
import { migrationHint } from "@/lib/db-errors";
import { canSendEmail } from "@/lib/mail";
import { isReservedSlug, slugify } from "@/lib/slug";
import {
  fieldErrorsFrom,
  formToObject,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  setPasswordSchema,
  type ActionState,
} from "@/lib/validation";

const GENERIC_EMAIL_MESSAGE =
  "Se este e-mail estiver cadastrado, você receberá um link em instantes. Confira também a caixa de spam.";

const MAIL_NOT_CONFIGURED_MESSAGE =
  "O envio de e-mails não está configurado. Peça ao suporte para ativar o serviço.";

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

async function deliverPasswordLink({
  user,
  storeName,
  type,
  invite = false,
  skipCooldown = false,
}: {
  user: { id: string; name: string; email: string };
  storeName: string;
  type: AuthTokenType;
  invite?: boolean;
  skipCooldown?: boolean;
}): Promise<boolean> {
  const issued = await issueAuthToken({
    userId: user.id,
    type,
    skipCooldown,
  });

  // Cooldown ativo: o link anterior continua válido, então não há o que reenviar.
  if (!issued) return true;

  return sendPasswordEmail({
    to: user.email,
    name: user.name,
    storeName,
    token: issued.token,
    type,
    invite,
  });
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

  if (!canSendEmail()) {
    return { ok: false, message: MAIL_NOT_CONFIGURED_MESSAGE };
  }

  const { storeName, name, email } = parsed.data;

  // Vínculo de afiliado: o campo oculto carrega o `?ref=` da página, e o cookie
  // cobre quem clicou no link e só se cadastrou depois de navegar pelo site.
  const refCode = (
    String(formData.get("ref") ?? "") ||
    (await cookies()).get("store77_ref")?.value ||
    ""
  ).trim();

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

  if (refCode) {
    try {
      const affiliate = await findActiveAffiliateByCode(refCode);
      if (affiliate) {
        await attributeReferral({
          storeId: store.id,
          affiliateId: affiliate.id,
          code: affiliate.code,
        });
      }
    } catch (error) {
      // Indicação não pode derrubar o cadastro da loja: fica no log para
      // conferência manual.
      console.error("Falha ao registrar indicação de afiliado", error);
    }
  }

  const [owner] = await db()
    .insert(users)
    .values({
      storeId: store.id,
      name,
      email,
      passwordHash: null,
      emailVerifiedAt: null,
      role: "OWNER",
      termsAcceptedAt: new Date(),
    })
    .returning({ id: users.id });

  let sent = false;
  try {
    // Todo cadastro nasce com 14 dias do plano Loja, sem cartão. Se a
    // assinatura falhar, a loja continua funcionando (fallback de acesso) e o
    // erro fica no log em vez de impedir o cadastro.
    await startTrial(store.id);
  } catch (error) {
    console.error("Falha ao criar o teste da assinatura", error);
  }

  try {
    sent = await deliverPasswordLink({
      user: { id: owner.id, name, email },
      storeName,
      type: "SET_PASSWORD",
      skipCooldown: true,
    });
  } catch (error) {
    console.error(
      `Falha ao gerar link de criação de senha:${migrationHint(error)}`,
      error,
    );
  }

  redirect(
    `/cadastro/confirmar?email=${encodeURIComponent(email)}${sent ? "" : "&falha=1"}`,
  );
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
      emailVerifiedAt: users.emailVerifiedAt,
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

  if (!user.passwordHash) {
    return {
      ok: false,
      message:
        "Sua conta ainda não tem senha. Use o link enviado por e-mail ou reenvie a confirmação.",
    };
  }

  if (!user.emailVerifiedAt) {
    return {
      ok: false,
      message:
        "Confirme seu e-mail para ativar a conta. Reenvie o link em “Reenviar confirmação”.",
    };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return invalid;

  await createSessionCookie(user.id);

  // Métrica de uso, não de cobrança: assento é usuário ativo alocado.
  await db()
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id))
    .catch(() => undefined);

  const next = formData.get("next");
  const target =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/dashboard";

  redirect(target);
}

export async function requestPasswordResetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verifique os campos destacados.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  if (!canSendEmail()) {
    return { ok: false, message: MAIL_NOT_CONFIGURED_MESSAGE };
  }

  const { email } = parsed.data;

  const [user] = await db()
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      passwordHash: users.passwordHash,
      role: users.role,
      storeName: stores.name,
    })
    .from(users)
    .innerJoin(stores, eq(stores.id, users.storeId))
    .where(and(sql`lower(${users.email}) = ${email}`, eq(users.active, true)))
    .limit(1);

  if (user) {
    try {
      await deliverPasswordLink({
        user,
        storeName: user.storeName,
        type: user.passwordHash ? "RESET_PASSWORD" : "SET_PASSWORD",
        invite: user.role !== "OWNER",
      });
    } catch (error) {
      console.error(
        `Falha ao gerar link de redefinição de senha:${migrationHint(error)}`,
        error,
      );
    }
  }

  // Mesma resposta exista ou não a conta: evita descobrir e-mails cadastrados.
  return { ok: true, message: GENERIC_EMAIL_MESSAGE };
}

export async function resendConfirmationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verifique os campos destacados.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  if (!canSendEmail()) {
    return { ok: false, message: MAIL_NOT_CONFIGURED_MESSAGE };
  }

  const { email } = parsed.data;

  const [user] = await db()
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      passwordHash: users.passwordHash,
      emailVerifiedAt: users.emailVerifiedAt,
      role: users.role,
      storeName: stores.name,
    })
    .from(users)
    .innerJoin(stores, eq(stores.id, users.storeId))
    .where(and(sql`lower(${users.email}) = ${email}`, eq(users.active, true)))
    .limit(1);

  const alreadyActive = Boolean(user?.passwordHash && user.emailVerifiedAt);

  if (user && !alreadyActive) {
    try {
      await deliverPasswordLink({
        user,
        storeName: user.storeName,
        type: user.passwordHash ? "RESET_PASSWORD" : "SET_PASSWORD",
        invite: user.role !== "OWNER",
      });
    } catch (error) {
      console.error("Falha ao reenviar confirmação:", error);
    }
  }

  return {
    ok: true,
    message:
      "Se este e-mail estiver pendente de confirmação, enviamos um novo link em instantes.",
  };
}

export async function setPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = setPasswordSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verifique os campos destacados.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const { token, password } = parsed.data;

  const exists = await findPendingAuthToken(token);
  if (!exists) {
    return {
      ok: false,
      message: "Este link é inválido ou expirou. Solicite um novo e-mail.",
    };
  }

  const passwordHash = await hashPassword(password);
  const result = await setPasswordWithToken(token, passwordHash);
  if (!result) {
    return {
      ok: false,
      message: "Este link é inválido ou expirou. Solicite um novo e-mail.",
    };
  }

  await createSessionCookie(result.userId);
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroySessionCookie();
  redirect("/login");
}
