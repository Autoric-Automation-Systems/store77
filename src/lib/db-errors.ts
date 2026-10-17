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
