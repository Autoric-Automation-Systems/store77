import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { products, stockMovements, type MovementType } from "@/db/schema";

type Db = ReturnType<typeof db>;
export type StockTx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export class StockError extends Error {}

export type MovementInput = {
  storeId: string;
  productId: string;
  type: MovementType;
  /** ENTRADA/SAIDA: quantidade movimentada. AJUSTE: saldo final desejado. */
  quantity: number;
  unitCostCents?: number | null;
  reason?: string | null;
  reference?: string | null;
  saleId?: string | null;
  userId?: string | null;
};

/**
 * Aplica a movimentação e devolve o saldo resultante.
 * Trava a linha do produto (`FOR UPDATE`) para que duas vendas simultâneas não
 * calculem o saldo a partir do mesmo valor.
 */
export async function applyMovement(
  tx: StockTx,
  input: MovementInput,
): Promise<{ balanceAfter: number }> {
  const [product] = await tx
    .select({
      id: products.id,
      name: products.name,
      quantity: products.quantity,
    })
    .from(products)
    .where(
      and(eq(products.id, input.productId), eq(products.storeId, input.storeId)),
    )
    .limit(1)
    .for("update");

  if (!product) throw new StockError("Produto não encontrado.");

  if (input.type === "ENTRADA" && input.quantity <= 0) {
    throw new StockError("Informe uma quantidade maior que zero.");
  }
  if (input.type === "SAIDA" && input.quantity <= 0) {
    throw new StockError("Informe uma quantidade maior que zero.");
  }
  if (input.type === "AJUSTE" && input.quantity < 0) {
    throw new StockError("O saldo não pode ser negativo.");
  }

  const balanceAfter =
    input.type === "ENTRADA"
      ? product.quantity + input.quantity
      : input.type === "SAIDA"
        ? product.quantity - input.quantity
        : input.quantity;

  if (balanceAfter < 0) {
    throw new StockError(
      `Estoque insuficiente de "${product.name}": disponível ${product.quantity}.`,
    );
  }

  await tx
    .update(products)
    .set({ quantity: balanceAfter, updatedAt: new Date() })
    .where(eq(products.id, product.id));

  await tx.insert(stockMovements).values({
    storeId: input.storeId,
    productId: product.id,
    type: input.type,
    quantity: input.quantity,
    balanceAfter,
    unitCostCents: input.unitCostCents ?? null,
    reason: input.reason ?? null,
    reference: input.reference ?? null,
    saleId: input.saleId ?? null,
    userId: input.userId ?? null,
  });

  return { balanceAfter };
}
