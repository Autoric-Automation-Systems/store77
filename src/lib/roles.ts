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

/**
 * Rotas que o servidor protege com `requireAdmin()`.
 *
 * Fonte única de verdade: o menu lateral deriva daqui quais itens mostrar, para
 * não existir o caso de um item aparecer e a página devolver redirect. Ao criar
 * uma rota restrita à gestão, adicione o prefixo aqui **e** use `requireAdmin()`
 * na página.
 */
export const ADMIN_ONLY_PREFIXES = [
  "/estoque/categorias",
  "/estoque/novo",
  "/financeiro",
  "/usuarios",
  "/vitrine",
] as const;

export function isAdminOnlyPath(pathname: string): boolean {
  return ADMIN_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
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
