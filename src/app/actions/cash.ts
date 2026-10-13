"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { cashMovements, cashSessions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatBRL, parseMoneyToCents } from "@/lib/format";
import {
  cashMovementSchema,
  fieldErrorsFrom,
  formToObject,
  type ActionState,
} from "@/lib/validation";

const MOVEMENT_LABELS = {
  ENTRADA: "Entrada",
  SAIDA: "Saída",
  SANGRIA: "Sangria",
  SUPRIMENTO: "Suprimento",
} as const;

function revalidateCash() {
  revalidatePath("/caixa");
  revalidatePath("/caixa/sessoes");
  revalidatePath("/dashboard");
}

function moneyFrom(formData: FormData, key: string): number {
  const value = formData.get(key);
  return parseMoneyToCents(typeof value === "string" ? value : null);
}

function notesFrom(formData: FormData): string | null {
  const value = formData.get("notes");
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function findOpenSession(storeId: string) {
  const [session] = await db()
    .select({
      id: cashSessions.id,
      openingAmountCents: cashSessions.openingAmountCents,
      notes: cashSessions.notes,
    })
    .from(cashSessions)
    .where(
      and(eq(cashSessions.storeId, storeId), eq(cashSessions.status, "ABERTO")),
    )
    .limit(1);

  return session ?? null;
}

export async function openCashSessionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const openingAmountCents = moneyFrom(formData, "openingAmountCents");
  const notes = notesFrom(formData);

  if (await findOpenSession(user.storeId)) {
    return {
      ok: false,
      message:
        "Já existe uma sessão de caixa aberta. Encerre a atual antes de abrir outra.",
    };
  }

  await db().insert(cashSessions).values({
    storeId: user.storeId,
    openedById: user.id,
    openingAmountCents,
    notes,
  });

  revalidateCash();

  return {
    ok: true,
    message: `Caixa aberto com fundo de troco de ${formatBRL(openingAmountCents)}.`,
  };
}

export async function closeCashSessionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const closingRaw = String(formData.get("closingAmountCents") ?? "").trim();

  if (!closingRaw) {
    return {
      ok: false,
      message: "Informe o valor contado em dinheiro.",
      fieldErrors: { closingAmountCents: "Informe o valor contado" },
    };
  }

  const closingAmountCents = parseMoneyToCents(closingRaw);
  const notes = notesFrom(formData);
  const closedAt = new Date();
  const userStoreId = user.storeId;

  const result = await db().transaction(async (tx) => {
    // Trava a sessão aberta para que dois encerramentos simultâneos não somem
    // os mesmos movimentos.
    const [session] = await tx
      .select({
        id: cashSessions.id,
        openingAmountCents: cashSessions.openingAmountCents,
        notes: cashSessions.notes,
      })
      .from(cashSessions)
      .where(
        and(
          eq(cashSessions.storeId, userStoreId),
          eq(cashSessions.status, "ABERTO"),
        ),
      )
      .limit(1)
      .for("update");

    if (!session) return null;

    const [totals] = await tx
      .select({
        entradas: sql<number>`coalesce(sum(${cashMovements.amountCents}) filter (where ${cashMovements.type} = 'ENTRADA'), 0)::int`,
        saidas: sql<number>`coalesce(sum(${cashMovements.amountCents}) filter (where ${cashMovements.type} = 'SAIDA'), 0)::int`,
        sangrias: sql<number>`coalesce(sum(${cashMovements.amountCents}) filter (where ${cashMovements.type} = 'SANGRIA'), 0)::int`,
        suprimentos: sql<number>`coalesce(sum(${cashMovements.amountCents}) filter (where ${cashMovements.type} = 'SUPRIMENTO'), 0)::int`,
      })
      .from(cashMovements)
      .where(eq(cashMovements.cashSessionId, session.id));

    const expectedCents =
      session.openingAmountCents +
      totals.entradas -
      totals.saidas -
      totals.sangrias +
      totals.suprimentos;

    await tx
      .update(cashSessions)
      .set({
        status: "FECHADO",
        closedAt,
        closedById: user.id,
        closingAmountCents,
        // Preserva as observações da abertura e acrescenta as do fechamento.
        notes: notes
          ? session.notes
            ? `${session.notes}\n${notes}`
            : notes
          : session.notes,
        updatedAt: closedAt,
      })
      .where(eq(cashSessions.id, session.id));

    return { expectedCents, differenceCents: closingAmountCents - expectedCents };
  });

  if (!result) {
    return { ok: false, message: "Nenhuma sessão de caixa aberta para encerrar." };
  }

  revalidateCash();

  const { differenceCents, expectedCents } = result;
  const message =
    differenceCents === 0
      ? `Sessão encerrada. Valor esperado ${formatBRL(expectedCents)} — conferência sem diferença.`
      : `Sessão encerrada. Diferença de ${formatBRL(Math.abs(differenceCents))} (${
          differenceCents > 0 ? "sobra" : "falta"
        }). Valor esperado: ${formatBRL(expectedCents)}.`;

  return { ok: true, message };
}

export async function registerCashMovementAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = cashMovementSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verifique os campos destacados.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const session = await findOpenSession(user.storeId);
  if (!session) {
    return {
      ok: false,
      message:
        "Nenhuma sessão de caixa aberta. Abra o caixa para registrar movimentos.",
    };
  }

  const { type, amountCents, description } = parsed.data;

  await db().insert(cashMovements).values({
    storeId: user.storeId,
    cashSessionId: session.id,
    type,
    amountCents,
    description,
    userId: user.id,
  });

  revalidateCash();

  return {
    ok: true,
    message: `${MOVEMENT_LABELS[type]} de ${formatBRL(amountCents)} registrado no caixa.`,
  };
}
