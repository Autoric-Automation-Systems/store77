/**
 * Regra de quem opera a plataforma, sem banco e sem `next/headers`.
 *
 * Fica separada de `platform.ts` por dois motivos: o menu do app precisa
 * consultá-la em toda página (não pode custar uma query), e a comparação pode
 * ser testada isoladamente. `PLATFORM_ADMIN_EMAILS` é a fonte de verdade em
 * ambos os usos — menu e autorização.
 */
export function platformAdminEmails(): string[] {
  return (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return platformAdminEmails().includes(email.trim().toLowerCase());
}
