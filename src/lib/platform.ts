import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { platformAdmins } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import type { SessionUser } from "@/lib/roles";
import { isPlatformAdminEmail } from "./platform-allowlist";

/**
 * Quem opera o painel interno.
 *
 * `PLATFORM_ADMIN_EMAILS` é a fonte de verdade: o e-mail precisa estar lá em
 * toda requisição. A tabela `platform_admins` é só trilha de auditoria de quem
 * já entrou — por isso sair da variável revoga o acesso na hora, e a linha é
 * removida para a tabela não mentir.
 *
 * Consequência operacional: com a variável vazia, ninguém acessa /admin.
 */
export async function isPlatformAdmin(
  userId: string,
  email: string,
): Promise<boolean> {
  const allowlisted = isPlatformAdminEmail(email);

  const [recorded] = await db()
    .select({ userId: platformAdmins.userId })
    .from(platformAdmins)
    .where(eq(platformAdmins.userId, userId))
    .limit(1);

  if (!allowlisted) {
    if (recorded) {
      await db()
        .delete(platformAdmins)
        .where(eq(platformAdmins.userId, userId));
    }
    return false;
  }

  if (!recorded) {
    await db()
      .insert(platformAdmins)
      .values({ userId, note: "Criado via PLATFORM_ADMIN_EMAILS" })
      .onConflictDoNothing();
  }
  return true;
}

export async function requirePlatformAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!(await isPlatformAdmin(user.id, user.email))) {
    redirect("/dashboard");
  }
  return user;
}
