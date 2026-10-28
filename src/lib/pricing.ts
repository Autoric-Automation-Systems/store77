export type ProductPrices = {
  priceCents: number;
  creditPriceCents: number | null;
};

/** Forma de pagamento que paga o preço cheio do cadastro. */
export function isCreditPayment(paymentMethod: string): boolean {
  return paymentMethod === "CREDITO";
}

/**
 * Preço unitário cobrado na venda. No crédito vale o preço cheio; produto sem
 * preço de crédito vende pelo preço à vista, que é o mesmo critério do anúncio
 * na vitrine. Zero conta como "não cadastrado" para não vender de graça.
 */
export function saleUnitPriceCents(
  product: ProductPrices,
  credit: boolean,
): number {
  if (!credit) return product.priceCents;
  const creditPriceCents = product.creditPriceCents;
  return creditPriceCents !== null && creditPriceCents > 0
    ? creditPriceCents
    : product.priceCents;
}
