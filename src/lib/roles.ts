import type { UserRole } from "@/db/schema";

/**
 * Módulo seguro para o bundle do cliente: sem banco, sem `next/headers`.
 * `lib/auth.ts` reexporta estes símbolos para o código de servidor.
 */

export const ROLE_LABELS: Record<UserRole, string> = {
  OWNER: "Proprietário",
  GERENTE: "Gerente",
  VENDEDOR: "Vendedor",
  CAIXA: "Operador de caixa",
  CLIENTE: "Cliente",
};

/** Papéis com acesso administrativo (estoque, financeiro, vitrine, equipe). */
export function isAdminRole(role: UserRole): boolean {
  return role === "OWNER" || role === "GERENTE";
}

/** Quem movimenta estoque (entrada, saída, ajuste). Caixa só vende. */
export function canManageStock(role: UserRole): boolean {
  return role === "OWNER" || role === "GERENTE" || role === "VENDEDOR";
}

/** Quem contrata, troca plano ou cancela a assinatura da loja. */
export function canManageBilling(role: UserRole): boolean {
  return role === "OWNER";
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
  "/assinatura",
] as const;

export function isAdminOnlyPath(pathname: string): boolean {
  return ADMIN_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * O caixa registra venda e opera o próprio turno, mas não administra estoque:
 * contagem e ajuste são do vendedor/gerente. Sem isso, um erro de digitação no
 * PDV viraria correção silenciosa de saldo.
 */
export const CAIXA_BLOCKED_PREFIXES = ["/estoque/movimentacoes"] as const;

export function isPathAllowed(role: UserRole, pathname: string): boolean {
  if (isAdminOnlyPath(pathname)) return isAdminRole(role);
  if (role === "CAIXA") {
    return !CAIXA_BLOCKED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
  }
  return true;
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
