/**
 * Erro do Postgres `undefined_table` (42P01). Costuma significar que a
 * migração mais recente não foi aplicada no banco do ambiente.
 */
export function isMissingTableError(error: unknown): boolean {
  const code = (error as { cause?: { code?: string } })?.cause?.code;
  return code === "42P01";
}

export function migrationHint(error: unknown): string {
  return isMissingTableError(error)
    ? "\nA tabela não existe no banco deste ambiente: rode `npm run db:migrate`."
    : "";
}

/** SQLSTATE do Postgres para violação de restrição única. */
const UNIQUE_VIOLATION = "23505";

/**
 * O Drizzle embrulha o erro do driver em `DrizzleQueryError`: a mensagem de
 * `error` vira "Failed query: ..." e o SQLSTATE/nome da restrição ficam no
 * `cause`. Por isso percorremos a cadeia, em vez de ler só `error.message`.
 */
export function isUniqueViolation(error: unknown, constraint: string): boolean {
  let current: unknown = error;
  while (current instanceof Error) {
    const { code, message } = current as Error & { code?: string };
    if (code === UNIQUE_VIOLATION && message.includes(constraint)) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}
