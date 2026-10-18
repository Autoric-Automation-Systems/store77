"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { affiliates } from "@/db/schema";
import {
  clearAffiliateCookie,
  setAffiliateCookie,
} from "@/lib/affiliate-cookies";
import { signAffiliateToken } from "@/lib/affiliate-session";
import { findAffiliateByEmail, generateAffiliateCode } from "@/lib/affiliates";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { isUniqueViolation, migrationHint } from "@/lib/db-errors";
import {
  affiliateLoginSchema,
  affiliateRegisterSchema,
  fieldErrorsFrom,
  formToObject,
  type ActionState,
} from "@/lib/validation";

/** Evita open redirect: o `next` só pode voltar para a área do afiliado. */
function safeNext(value: FormDataEntryValue | null): string {
  const next = String(value ?? "");
  return next.startsWith("/afiliados/") ? next : "/afiliados/painel";
}

export async function registerAffiliateAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = affiliateRegisterSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verifique os campos destacados.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const { name, email, document, pixKey, notes, password } = parsed.data;

  if (await findAffiliateByEmail(email)) {
    return {
      ok: false,
      message: "Este e-mail já tem cadastro de afiliado.",
      fieldErrors: { email: "E-mail já cadastrado" },
    };
  }

  const code = await generateAffiliateCode(name);
  const now = new Date();

  let affiliateId: string;
  try {
    const [created] = await db()
      .insert(affiliates)
      .values({
        name,
        email,
        document,
        pixKey,
        notes,
        code,
        // Credenciamento é imediato: o link já vale e a comissão começa a
        // contar. O admin pode suspender depois, se houver uso indevido.
        status: "ATIVO",
        approvedAt: now,
        termsAcceptedAt: now,
        passwordHash: await hashPassword(password),
      })
      .returning({ id: affiliates.id });
    affiliateId = created.id;
  } catch (error) {
    if (isUniqueViolation(error, "affiliates_email_key")) {
      return {
        ok: false,
        message: "Este e-mail já tem cadastro de afiliado.",
        fieldErrors: { email: "E-mail já cadastrado" },
      };
    }
    console.error(`Falha ao cadastrar afiliado:${migrationHint(error)}`, error);
    return {
      ok: false,
      message: "Não foi possível concluir o cadastro. Tente novamente.",
    };
  }

  await setAffiliateCookie(await signAffiliateToken(affiliateId));
  redirect("/afiliados/painel?novo=1");
}

export async function loginAffiliateAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = affiliateLoginSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verifique os campos destacados.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const { email, password } = parsed.data;
  const affiliate = await findAffiliateByEmail(email);

  // Mesma resposta para e-mail inexistente e senha errada: evita enumeração.
  const invalid: ActionState = {
    ok: false,
    message: "E-mail ou senha inválidos.",
  };

  if (!affiliate?.passwordHash) return invalid;
  if (!(await verifyPassword(password, affiliate.passwordHash))) return invalid;

  if (affiliate.status === "SUSPENSO" || affiliate.status === "RECUSADO") {
    return {
      ok: false,
      message:
        "Este cadastro não está ativo. Fale com o suporte para regularizar.",
    };
  }

  await db()
    .update(affiliates)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(affiliates.id, affiliate.id));

  await setAffiliateCookie(await signAffiliateToken(affiliate.id));
  redirect(safeNext(formData.get("next")));
}

export async function logoutAffiliateAction(): Promise<void> {
  await clearAffiliateCookie();
  redirect("/afiliados");
}
