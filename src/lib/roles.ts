import type { UserRole } from "@/db/schema";

/**
 * Módulo seguro para o bundle do cliente: sem banco, sem `next/headers`.
 * `lib/auth.ts` reexporta estes símbolos para o código de servidor.
 */

export const ROLE_LABELS: Record<UserRole, string> = {
  OWNER: "Proprietário",
  GERENTE: "Gerente",
  VENDEDOR: "Vendedor",
  CLIENTE: "Cliente",
};

/** Papéis com acesso administrativo (estoque, financeiro, vitrine, equipe). */
export function isAdminRole(role: UserRole): boolean {
  return role === "OWNER" || role === "GERENTE";
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  storeId: string;
  storeName: string;
  storeSlug: string;
};
