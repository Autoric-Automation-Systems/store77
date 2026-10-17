"use server";

import { and, eq, inArray, max, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  cashMovements,
  cashSessions,
  customers,
  products,
  saleItems,
  sales,
  stores,
} from "@/db/schema";
import { requireAdmin, requireUser } from "@/lib/auth";
import { isUniqueViolation } from "@/lib/db-errors";
import { formatBRL } from "@/lib/format";
import { applyMovement, StockError } from "@/lib/stock";
import {
  checkoutSchema,
  fieldErrorsFrom,
  formToObject,
  type ActionState,
} from "@/lib/validation";

function revalidateSales() {
  revalidatePath("/caixa");
  revalidatePath("/caixa/sessoes");
  revalidatePath("/caixa/vendas");
  revalidatePath("/estoque");
  revalidatePath("/estoque/movimentacoes");
  revalidatePath("/dashboard");
}

/** O carrinho chega como JSON em `items`; qualquer payload inesperado vira lista vazia. */
function parseItems(formData: FormData): unknown {
  const raw = formData.get("items");
  if (typeof raw !== "string" || raw.trim().length === 0) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function finalizeSaleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const raw = { ...formToObject(formData), items: parseItems(formData) };
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verifique os itens, o cliente e a forma de pagamento.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const { items, customerId, discountCents, paymentMethod, notes } = parsed.data;
  const productIds = [...new Set(items.map((item) => item.productId))];

  let saleCustomerId: string | null = null;
  if (customerId) {
    const [customer] = await db()
      .select({ id: customers.id })
      .from(customers)
      .where(
        and(eq(customers.id, customerId), eq(customers.storeId, user.storeId)),
      )
      .limit(1);

    if (!customer) {
      return {
        ok: false,
        message: "Cliente não encontrado.",
        fieldErrors: { customerId: "Selecione um cliente válido" },
      };
    }
    saleCustomerId = customer.id;
  }

  try {
    const result = await db().transaction(async (tx) => {
      // Trava a loja: a numeração da venda é sequencial por loja.
      await tx
        .select({ id: stores.id })
        .from(stores)
        .where(eq(stores.id, user.storeId))
        .limit(1)
        .for("update");

      const [lastSale] = await tx
        .select({ number: max(sales.number) })
        .from(sales)
        .where(eq(sales.storeId, user.storeId));
      const number = (lastSale?.number ?? 0) + 1;

      const productRows = await tx
        .select({
          id: products.id,
          code: products.code,
          name: products.name,
          priceCents: products.priceCents,
          costCents: products.costCents,
        })
        .from(products)
        .where(
          and(
            eq(products.storeId, user.storeId),
            eq(products.active, true),
            inArray(products.id, productIds),
          ),
        );

      const byId = new Map(
        productRows.map((row) => [row.id, row] as const),
      );
      if (productRows.length !== productIds.length) {
        throw new StockError("Produto indisponível.");
      }

      // Preço e custo vêm sempre do banco, nunca do carrinho do cliente.
      const lines = items.map((item) => {
        const product = byId.get(item.productId);
        if (!product) throw new StockError("Produto indisponível.");

        return {
          product,
          quantity: item.quantity,
          totalCents: product.priceCents * item.quantity,
        };
      });

      const subtotalCents = lines.reduce((sum, line) => sum + line.totalCents, 0);
      const appliedDiscount = Math.min(Math.max(discountCents, 0), subtotalCents);
      const totalCents = subtotalCents - appliedDiscount;

      const [openSession] = await tx
        .select({ id: cashSessions.id })
        .from(cashSessions)
        .where(
          and(
            eq(cashSessions.storeId, user.storeId),
            eq(cashSessions.status, "ABERTO"),
          ),
        )
        .limit(1);

      const [sale] = await tx
        .insert(sales)
        .values({
          storeId: user.storeId,
          number,
          customerId: saleCustomerId,
          sellerId: user.id,
          cashSessionId: openSession?.id ?? null,
          status: "PAGA",
          subtotalCents,
          discountCents: appliedDiscount,
          totalCents,
          paymentMethod,
          notes,
          closedAt: new Date(),
        })
        .returning({ id: sales.id });

      await tx.insert(saleItems).values(
        lines.map((line) => ({
          saleId: sale.id,
          productId: line.product.id,
          code: line.product.code,
          name: line.product.name,
          quantity: line.quantity,
          unitPriceCents: line.product.priceCents,
          unitCostCents: line.product.costCents,
          totalCents: line.totalCents,
        })),
      );

      for (const line of lines) {
        await applyMovement(tx, {
          storeId: user.storeId,
          productId: line.product.id,
          type: "SAIDA",
          quantity: line.quantity,
          reason: "Venda",
          reference: `Venda #${number}`,
          saleId: sale.id,
          userId: user.id,
        });
      }

      // Só o dinheiro em espécie passa pelo caixa; as demais formas ficam na venda.
      if (paymentMethod === "DINHEIRO" && openSession) {
        await tx.insert(cashMovements).values({
          storeId: user.storeId,
          cashSessionId: openSession.id,
          type: "ENTRADA",
          amountCents: totalCents,
          description: `Venda #${number}`,
          saleId: sale.id,
          userId: user.id,
        });
      }

      return { number, totalCents };
    });

    revalidateSales();

    return {
      ok: true,
      message: `Venda #${result.number} registrada — ${formatBRL(result.totalCents)}.`,
    };
  } catch (error) {
    if (error instanceof StockError) {
      return { ok: false, message: error.message };
    }
    if (isUniqueViolation(error, "sales_store_number_key")) {
      return {
        ok: false,
        message: "Não foi possível numerar a venda. Tente novamente.",
      };
    }
    throw error;
  }
}

export async function cancelSaleAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/caixa/vendas");

  await db().transaction(async (tx) => {
    const [sale] = await tx
      .select({
        id: sales.id,
        number: sales.number,
        status: sales.status,
        cashSessionId: sales.cashSessionId,
      })
      .from(sales)
      .where(and(eq(sales.id, id), eq(sales.storeId, user.storeId)))
      .limit(1);

    // Venda de outra loja ou já cancelada: nada a fazer.
    if (!sale || sale.status === "CANCELADA") return;

    await tx
      .update(sales)
      .set({ status: "CANCELADA", updatedAt: new Date() })
      .where(eq(sales.id, sale.id));

    const items = await tx
      .select({
        productId: saleItems.productId,
        quantity: saleItems.quantity,
      })
      .from(saleItems)
      .where(eq(saleItems.saleId, sale.id));

    for (const item of items) {
      // Produtos excluídos deixam o item sem referência: nada a devolver.
      if (!item.productId) continue;

      await applyMovement(tx, {
        storeId: user.storeId,
        productId: item.productId,
        type: "ENTRADA",
        quantity: item.quantity,
        reason: `Cancelamento da venda #${sale.number}`,
        reference: `Cancelamento da venda #${sale.number}`,
        saleId: sale.id,
        userId: user.id,
      });
    }

    const [received] = await tx
      .select({
        total: sql<number>`coalesce(sum(${cashMovements.amountCents}), 0)::int`,
      })
      .from(cashMovements)
      .where(
        and(
          eq(cashMovements.saleId, sale.id),
          eq(cashMovements.type, "ENTRADA"),
        ),
      );

    const receivedCents = received?.total ?? 0;

    // Estorna sempre na sessão original, mesmo fechada, para preservar o histórico.
    if (sale.cashSessionId && receivedCents > 0) {
      await tx.insert(cashMovements).values({
        storeId: user.storeId,
        cashSessionId: sale.cashSessionId,
        type: "SAIDA",
        amountCents: receivedCents,
        description: `Estorno da venda #${sale.number}`,
        saleId: sale.id,
        userId: user.id,
      });
    }
  });

  revalidateSales();
  redirect("/caixa/vendas");
}
