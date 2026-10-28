// Extensão explícita: `npm test` executa este arquivo direto no node, sem bundler.
import { formatBRL } from "./format.ts";

export type InstallmentPlan = {
  /** Número de parcelas anunciado (sempre 2 ou mais). */
  count: number;
  /** Valor de cada parcela em centavos; a divisão pode deixar sobra de centavos. */
  installmentCents: number;
  /** Total cobrado no crédito em centavos. */
  totalCents: number;
};

export function splitInstallments(
  totalCents: number,
  count: number,
): InstallmentPlan | null {
  const parcels = Math.trunc(Number(count));
  if (!Number.isFinite(parcels) || parcels < 2) return null;
  if (totalCents <= 0) return null;

  const installmentCents = Math.round(totalCents / parcels);
  if (installmentCents <= 0) return null;

  return { count: parcels, installmentCents, totalCents };
}

/**
 * Plano exibido na vitrine. O preço no crédito é a base das parcelas; quando a
 * loja não cadastrou um preço de crédito, o preço à vista é usado, que é como a
 * maioria das lojas brasileiras anuncia ("3x sem juros" = mesmo preço).
 */
export function installmentPlan(
  cashPriceCents: number,
  creditPriceCents?: number | null,
  installments?: number | null,
): InstallmentPlan | null {
  const totalCents =
    creditPriceCents && creditPriceCents > 0 ? creditPriceCents : cashPriceCents;
  return splitInstallments(totalCents, Number(installments ?? 1));
}

/** Texto do card, no formato usado por Mercado Livre, Nuvemshop e Shopee. */
export function installmentLabel(plan: InstallmentPlan | null): string | null {
  if (!plan) return null;
  return `ou ${plan.count}x de ${formatBRL(plan.installmentCents)} sem juros`;
}

/**
 * Parcelamento aceito por uma venda: vale o limite do item mais restritivo.
 * Carrinho vazio ou item só à vista derruba o anúncio para 1x.
 */
export function cartInstallmentsLimit(itemLimits: number[]): number {
  if (itemLimits.length === 0) return 1;
  return itemLimits.reduce((limit, itemLimit) => {
    const parsed = Math.trunc(Number(itemLimit));
    return Math.min(limit, Number.isFinite(parsed) ? Math.max(parsed, 1) : 1);
  }, Number.POSITIVE_INFINITY);
}
