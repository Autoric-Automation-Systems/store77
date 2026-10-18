"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { authTokens, users, type UserRole } from "@/db/schema";
import {
  getCurrentUser,
  hashPassword,
  requireAdminCapability,
  verifyPassword,
} from "@/lib/auth";
import { sendPasswordEmail } from "@/lib/auth-emails";
import { issueAuthToken } from "@/lib/auth-tokens";
import {
  BillingError,
  assertSeatAvailable,
} from "@/lib/billing/entitlements";
import { isUniqueViolation, migrationHint } from "@/lib/db-errors";
import { canSendEmail } from "@/lib/mail";
import {
  fieldErrorsFrom,
  formToObject,
  optionalText,
  passwordSchema,
  teamMemberSchema,
  type ActionState,
} from "@/lib/validation";

const LAST_OWNER_MESSAGE = "A loja precisa de ao menos um proprietário ativo.";
const SELF_MESSAGE = "Você não pode executar esta ação em você mesmo.";

const updateMemberSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2, "Informe o nome").max(120),
  phone: optionalText(40),
  role: z.enum(["OWNER", "GERENTE", "VENDEDOR", "CAIXA", "CLIENTE"]),
});

const resetPasswordSchema = z.object({
  id: z.string().uuid(),
  password: passwordSchema,
});

const changeOwnPasswordSchema = z.object({
  currentPassword: z.string().min(1, "Informe a senha atual"),
  newPassword: passwordSchema,
});

type MemberRow = {
  id: string;
  name: string;
  phone: string | null;
  role: UserRole;
  active: boolean;
};

function isDuplicateEmailError(error: unknown): boolean {
  return isUniqueViolation(error, "users_email_key");
}

function emailExists() {
  return {
    ok: false as const,
    message: "E-mail já cadastrado.",
    fieldErrors: { email: "E-mail já cadastrado" },
  };
}

/** Busca restrita à loja do usuário logado: nenhum id do cliente escapa do tenant. */
async function findMember(
  storeId: string,
  id: string,
): Promise<MemberRow | null> {
  const [row] = await db()
    .select({
      id: users.id,
      name: users.name,
      phone: users.phone,
      role: users.role,
      active: users.active,
    })
    .from(users)
    .where(and(eq(users.id, id), eq(users.storeId, storeId)))
    .limit(1);

  return row ?? null;
}

async function activeOwnerCount(storeId: string): Promise<number> {
  const [row] = await db()
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(
      and(
        eq(users.storeId, storeId),
        eq(users.role, "OWNER"),
        eq(users.active, true),
      ),
    );

  return row?.count ?? 0;
}

/** Regra 2: bloquearia a loja se este OWNER ativo fosse o último da loja. */
async function isLastActiveOwner(
  storeId: string,
  member: MemberRow,
): Promise<boolean> {
  if (!member.active || member.role !== "OWNER") return false;
  return (await activeOwnerCount(storeId)) <= 1;
}

export async function createTeamMemberAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAdminCapability("manageTeam");

  const parsed = teamMemberSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verifique os campos destacados.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const { name, email, role } = parsed.data;

  // Cliente da vitrine não ocupa assento; quem opera a loja ocupa.
  if (role !== "CLIENTE") {
    try {
      await assertSeatAvailable(user.storeId);
    } catch (error) {
      if (error instanceof BillingError) {
        return { ok: false, message: error.message };
      }
      throw error;
    }
  }

  if (!canSendEmail()) {
    return {
      ok: false,
      message:
        "O envio de e-mails não está configurado. Peça ao suporte para ativar o serviço.",
    };
  }

  // O e-mail é único globalmente (índice em lower(email)), não só na loja.
  const [existing] = await db()
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);

  if (existing) return emailExists();

  let member: { id: string };
  try {
    [member] = await db()
      .insert(users)
      .values({
        storeId: user.storeId,
        name,
        email,
        passwordHash: null,
        emailVerifiedAt: null,
        role,
        active: true,
      })
      .returning({ id: users.id });
  } catch (error) {
    // Fallback: corrida entre a checagem acima e o insert.
    if (isDuplicateEmailError(error)) return emailExists();
    throw error;
  }

  revalidatePath("/usuarios");

  try {
    const issued = await issueAuthToken({
      userId: member.id,
      type: "SET_PASSWORD",
      skipCooldown: true,
    });
    if (issued) {
      const sent = await sendPasswordEmail({
        to: email,
        name,
        storeName: user.storeName,
        token: issued.token,
        type: "SET_PASSWORD",
        invite: true,
      });
      if (!sent) {
        return {
          ok: true,
          message:
            "Membro criado, mas não foi possível enviar o convite. Peça para usar 'Esqueci minha senha' com este e-mail.",
        };
      }
    }
  } catch (error) {
    console.error(`Falha ao enviar convite:${migrationHint(error)}`, error);
    return {
      ok: true,
      message:
        "Membro criado, mas não foi possível enviar o convite. Peça para usar 'Esqueci minha senha' com este e-mail.",
    };
  }

  return {
    ok: true,
    message: `Convite enviado para ${email}. A pessoa cria a senha pelo link.`,
  };
}

export async function updateTeamMemberAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAdminCapability("manageTeam");

  const parsed = updateMemberSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verifique os campos destacados.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const { id, name, phone, role } = parsed.data;
  const member = await findMember(user.storeId, id);
  if (!member) return { ok: false, message: "Membro não encontrado." };

  // Regra 3: ninguém altera o próprio papel.
  if (member.id === user.id && role !== member.role) {
    return {
      ok: false,
      message: SELF_MESSAGE,
      fieldErrors: { role: "Você não pode alterar o seu próprio papel" },
    };
  }

  // Regra 2: rebaixar o último OWNER ativo deixaria a loja sem proprietário.
  if (role !== "OWNER" && (await isLastActiveOwner(user.storeId, member))) {
    return {
      ok: false,
      message: LAST_OWNER_MESSAGE,
      fieldErrors: { role: LAST_OWNER_MESSAGE },
    };
  }

  await db()
    .update(users)
    .set({ name, phone, role, updatedAt: new Date() })
    .where(and(eq(users.id, id), eq(users.storeId, user.storeId)));

  revalidatePath("/usuarios");
  return { ok: true, message: "Membro atualizado." };
}

export async function toggleUserActiveAction(formData: FormData): Promise<void> {
  const user = await requireAdminCapability("manageTeam");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const member = await findMember(user.storeId, id);
  if (!member) return;

  // Regra 3: não desativar a si mesmo.
  if (member.id === user.id) return;

  // Regra 2: não desativar o último proprietário ativo.
  if (await isLastActiveOwner(user.storeId, member)) return;

  // Reativar alguém volta a ocupar assento: mesma trava do convite.
  if (!member.active && member.role !== "CLIENTE") {
    try {
      await assertSeatAvailable(user.storeId);
    } catch (error) {
      if (error instanceof BillingError) {
        redirect("/usuarios?limite=1");
      }
      throw error;
    }
  }

  await db()
    .update(users)
    .set({ active: sql`NOT ${users.active}`, updatedAt: new Date() })
    .where(and(eq(users.id, id), eq(users.storeId, user.storeId)));

  revalidatePath("/usuarios");
}

export async function resetUserPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAdminCapability("manageTeam");

  const parsed = resetPasswordSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verifique os campos destacados.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const { id, password } = parsed.data;
  const member = await findMember(user.storeId, id);
  if (!member) return { ok: false, message: "Membro não encontrado." };

  const passwordHash = await hashPassword(password);

  await db().transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        passwordHash,
        // O admin definiu a senha diretamente; não faz sentido manter o login
        // bloqueado esperando uma confirmação que já foi suprida por ele.
        emailVerifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, id), eq(users.storeId, user.storeId)));

    // Links pendentes permitiriam trocar a senha recém-definida.
    await tx.delete(authTokens).where(eq(authTokens.userId, id));
  });

  revalidatePath("/usuarios");
  return { ok: true, message: `Senha de ${member.name} redefinida.` };
}

export async function deleteTeamMemberAction(formData: FormData): Promise<void> {
  const user = await requireAdminCapability("manageTeam");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const member = await findMember(user.storeId, id);

  if (
    member &&
    member.id !== user.id && // Regra 3: não excluir a si mesmo.
    !(await isLastActiveOwner(user.storeId, member)) // Regra 2.
  ) {
    await db()
      .delete(users)
      .where(and(eq(users.id, id), eq(users.storeId, user.storeId)));

    revalidatePath("/usuarios");
  }

  redirect("/usuarios");
}

export async function changeOwnPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, message: "Sessão expirada. Entre novamente." };
  }

  const parsed = changeOwnPasswordSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verifique os campos destacados.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const { currentPassword, newPassword } = parsed.data;

  const [row] = await db()
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(and(eq(users.id, user.id), eq(users.storeId, user.storeId)))
    .limit(1);

  if (!row || !row.passwordHash) {
    return { ok: false, message: "Usuário não encontrado." };
  }

  const valid = await verifyPassword(currentPassword, row.passwordHash);
  if (!valid) {
    return {
      ok: false,
      message: "Senha atual incorreta.",
      fieldErrors: { currentPassword: "Senha atual incorreta" },
    };
  }

  const passwordHash = await hashPassword(newPassword);

  await db()
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(and(eq(users.id, user.id), eq(users.storeId, user.storeId)));

  return { ok: true, message: "Senha alterada." };
}
