export const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatBRL(cents: number | null | undefined): string {
  return BRL.format((cents ?? 0) / 100);
}

/** Aceita "1.234,56", "1234.56", "R$ 10" e devolve centavos. */
export function parseMoneyToCents(input: string | number | null | undefined): number {
  if (input === null || input === undefined) return 0;
  if (typeof input === "number") return Math.round(input * 100);

  const cleaned = input
    .replace(/[^\d.,-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

/** Centavos -> string pronta para um input type="text" no padrão brasileiro. */
export function centsToInput(cents: number | null | undefined): string {
  return ((cents ?? 0) / 100).toFixed(2).replace(".", ",");
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(`${value}T12:00:00`) : value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date);
}

/** Versão curta para telas estreitas, onde a data completa ocupa colunas demais. */
export function formatDateTimeShort(
  value: Date | string | null | undefined,
): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
