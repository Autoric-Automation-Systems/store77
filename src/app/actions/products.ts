"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { categories, productImages, products } from "@/db/schema";
import { applyMovement, StockError } from "@/lib/stock";
import { requireAdmin, requireUser } from "@/lib/auth";
import {
  fieldErrorsFrom,
  formToObject,
  productSchema,
  stockMovementSchema,
  type ActionState,
} from "@/lib/validation";

function parseImages(formData: FormData): string[] {
  const raw = formData.get("images");
  if (typeof raw !== "string" || raw.length === 0) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .slice(0, 8);
  } catch {
    return [];
  }
}

function revalidateStock() {
  revalidatePath("/estoque");
  revalidatePath("/estoque/movimentacoes");
  revalidatePath("/dashboard");
  revalidatePath("/caixa");
  revalidatePath("/vitrine");
}

async function categoryBelongsToStore(storeId: string, categoryId: string | null) {
  if (!categoryId) return true;
  const [row] = await db()
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.storeId, storeId)))
    .limit(1);
  return Boolean(row);
}

export async function saveProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAdmin();

  const raw = formToObject(formData);
  raw.images = parseImages(formData);

  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verifique os campos destacados.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const data = parsed.data;

  if (!(await categoryBelongsToStore(user.storeId, data.categoryId))) {
    return {
      ok: false,
      message: "Tipo/nicho inválido.",
      fieldErrors: { categoryId: "Selecione um tipo válido" },
    };
  }

  const values = {
    storeId: user.storeId,
    categoryId: data.categoryId,
    code: data.code,
    name: data.name,
    description: data.description,
    barcode: data.barcode,
    unit: data.unit.toUpperCase(),
    priceCents: data.priceCents,
    costCents: data.costCents,
    minQuantity: data.minQuantity,
    location: data.location,
    active: data.active,
  };

  try {
    if (data.id) {
      const [current] = await db()
        .select({ id: products.id, quantity: products.quantity })
        .from(products)
        .where(
          and(eq(products.id, data.id), eq(products.storeId, user.storeId)),
        )
        .limit(1);

      if (!current) return { ok: false, message: "Produto não encontrado." };

      await db()
        .update(products)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(products.id, data.id));

      // A quantidade do formulário é um atalho: vira um AJUSTE rastreável.
      if (data.quantity !== current.quantity) {
        await db().transaction(async (tx) => {
          await applyMovement(tx, {
            storeId: user.storeId,
            productId: data.id as string,
            type: "AJUSTE",
            quantity: data.quantity,
            reason: "Ajuste pelo cadastro do produto",
            userId: user.id,
          });
        });
      }

      await db()
        .delete(productImages)
        .where(eq(productImages.productId, data.id));
      if (data.images.length > 0) {
        await db()
          .insert(productImages)
          .values(
            data.images.map((url, index) => ({
              productId: data.id as string,
              url,
              sortOrder: index,
            })),
          );
      }
    } else {
      const productId = await db().transaction(async (tx) => {
        const [created] = await tx
          .insert(products)
          .values({ ...values, quantity: 0 })
          .returning({ id: products.id });

        if (data.images.length > 0) {
          await tx.insert(productImages).values(
            data.images.map((url, index) => ({
              productId: created.id,
              url,
              sortOrder: index,
            })),
          );
        }

        if (data.quantity > 0) {
          await applyMovement(tx, {
            storeId: user.storeId,
            productId: created.id,
            type: "ENTRADA",
            quantity: data.quantity,
            unitCostCents: data.costCents,
            reason: "Estoque inicial",
            userId: user.id,
          });
        }

        return created.id;
      });

      revalidateStock();
      redirect(`/estoque/${productId}`);
    }
  } catch (error) {
    if (error instanceof StockError) {
      return {
        ok: false,
        message: error.message,
        fieldErrors: { quantity: error.message },
      };
    }
    if (
      error instanceof Error &&
      /products_store_code_key|duplicate key/i.test(error.message)
    ) {
      return {
        ok: false,
        message: "Já existe um produto com este código.",
        fieldErrors: { code: "Código já utilizado" },
      };
    }
    throw error;
  }

  revalidateStock();
  revalidatePath(`/estoque/${data.id}`);
  redirect("/estoque");
}

export async function toggleProductActiveAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db()
    .update(products)
    .set({ active: sql`NOT ${products.active}`, updatedAt: new Date() })
    .where(and(eq(products.id, id), eq(products.storeId, user.storeId)));

  revalidateStock();
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // Vendas antigas preservam os snapshots; os itens apenas perdem a referência.
  await db()
    .delete(products)
    .where(and(eq(products.id, id), eq(products.storeId, user.storeId)));

  revalidateStock();
  redirect("/estoque");
}

export async function createStockMovementAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = stockMovementSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verifique os campos destacados.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const { productId, type, quantity, unitCostCents, reason } = parsed.data;

  try {
    const result = await db().transaction(async (tx) =>
      applyMovement(tx, {
        storeId: user.storeId,
        productId,
        type,
        quantity,
        unitCostCents: unitCostCents ?? null,
        reason,
        userId: user.id,
      }),
    );

    revalidateStock();
    revalidatePath(`/estoque/${productId}`);

    const labels = {
      ENTRADA: "Entrada registrada",
      SAIDA: "Saída registrada",
      AJUSTE: "Estoque ajustado",
    } as const;

    return {
      ok: true,
      message: `${labels[type]}. Saldo atual: ${result.balanceAfter}.`,
    };
  } catch (error) {
    if (error instanceof StockError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
}
