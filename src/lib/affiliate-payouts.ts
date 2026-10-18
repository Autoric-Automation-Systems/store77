import { and, asc, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  affiliateCommissions,
  affiliatePayouts,
  affiliates,
  stores,
} from "@/db/schema";
import { asaas, AsaasError } from "@/lib/billing/asaas";
import type { PixKeyType } from "@/lib/billing/provider";
import { isUniqueViolation } from "@/lib/db-errors";
import { normalizePixKey, pixKeyTypeOf } from "@/lib/pix";

export { normalizePixKey, pixKeyTypeOf } from "@/lib/pix";

export class PayoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PayoutError";
  }
}

export type AvailableCommission = {
  id: string;
  storeName: string;
  amountCents: number;
  availableAt: Date | null;
  createdAt: Date;
};

/**
 * Comissões liberadas e ainda não pagas. "Disponível" é conta com o relógio,
 * não coluna: o status gravado segue `PENDENTE` até o repasse.
 */
export async function availableCommissions(
  affiliateId: string,
  now = new Date(),
): Promise<AvailableCommission[]> {
  return db()
    .select({
      id: affiliateCommissions.id,
      storeName: stores.name,
      amountCents: affiliateCommissions.amountCents,
      availableAt: affiliateCommissions.availableAt,
      createdAt: affiliateCommissions.createdAt,
    })
    .from(affiliateCommissions)
    .innerJoin(stores, eq(stores.id, affiliateCommissions.storeId))
    .where(
      and(
        eq(affiliateCommissions.affiliateId, affiliateId),
        eq(affiliateCommissions.status, "PENDENTE"),
        isNull(affiliateCommissions.payoutId),
        lte(affiliateCommissions.availableAt, now),
      ),
    )
    .orderBy(asc(affiliateCommissions.availableAt));
}

export function sumCents(rows: { amountCents: number }[]): number {
  return rows.reduce((total, row) => total + row.amountCents, 0);
}

export type PayoutQueueItem = {
  affiliateId: string;
  name: string;
  email: string;
  pixKey: string | null;
  pixKeyType: PixKeyType | null;
  availableCents: number;
  commissionCount: number;
};

/** Fila de repasse: quem tem comissão liberada, do maior saldo ao menor. */
export async function payoutQueue(now = new Date()): Promise<PayoutQueueItem[]> {
  const rows = await db()
    .select({
      affiliateId: affiliates.id,
      name: affiliates.name,
      email: affiliates.email,
      pixKey: affiliates.pixKey,
      pixKeyType: affiliates.pixKeyType,
      document: affiliates.document,
      availableCents: sql<number>`coalesce(sum(${affiliateCommissions.amountCents}), 0)::int`,
      commissionCount: sql<number>`count(*)::int`,
    })
    .from(affiliateCommissions)
    .innerJoin(affiliates, eq(affiliates.id, affiliateCommissions.affiliateId))
    .where(
      and(
        eq(affiliateCommissions.status, "PENDENTE"),
        isNull(affiliateCommissions.payoutId),
        lte(affiliateCommissions.availableAt, now),
      ),
    )
    .groupBy(
      affiliates.id,
      affiliates.name,
      affiliates.email,
      affiliates.pixKey,
      affiliates.pixKeyType,
      affiliates.document,
    );

  return rows
    .map((row) => ({
      affiliateId: row.affiliateId,
      name: row.name,
      email: row.email,
      pixKey: row.pixKey,
      pixKeyType:
        (row.pixKeyType as PixKeyType | null) ??
        (row.pixKey ? pixKeyTypeOf(row.pixKey, row.document) : null),
      availableCents: row.availableCents,
      commissionCount: row.commissionCount,
    }))
    .sort((a, b) => b.availableCents - a.availableCents);
}

export type PayoutResult = {
  payoutId: string;
  amountCents: number;
  providerTransferId: string;
  providerStatus: string;
};

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

type AffiliateForPayout = {
  id: string;
  name: string;
  document: string | null;
  pixKey: string | null;
  pixKeyType: string | null;
};

async function transferToAffiliate(
  payout: { id: string; amountCents: number },
  affiliate: AffiliateForPayout,
): Promise<{
  providerTransferId: string;
  status: string;
  endToEndId: string | null;
}> {
  if (!affiliate.pixKey) {
    throw new PayoutError(
      "Afiliado sem chave Pix: peça a chave antes de enviar o repasse.",
    );
  }

  const keyType =
    (affiliate.pixKeyType as PixKeyType | null) ??
    pixKeyTypeOf(affiliate.pixKey, affiliate.document);

  try {
    return await asaas().createTransfer({
      amountCents: payout.amountCents,
      pixAddressKey: normalizePixKey(affiliate.pixKey, keyType),
      pixAddressKeyType: keyType,
      description: `Store77 · comissão de afiliado ${affiliate.name}`,
      externalReference: payout.id,
    });
  } catch (error) {
    const reason =
      error instanceof AsaasError
        ? `Gateway recusou a transferência (${error.status}).`
        : error instanceof Error
          ? error.message
          : "Falha desconhecida no envio.";

    await db()
      .update(affiliatePayouts)
      .set({ failureReason: reason, updatedAt: new Date() })
      .where(eq(affiliatePayouts.id, payout.id));

    throw new PayoutError(reason);
  }
}

/**
 * Envia o Pix das comissões liberadas.
 *
 * A ordem importa: grava o repasse, amarra as comissões a ele e só então chama
 * o gateway. Se o envio falhar, o lote continua reservado — nenhuma comissão
 * entra em dois repasses. O status vira PAGO apenas no webhook `TRANSFER_DONE`,
 * porque criar a transferência não significa que o dinheiro saiu.
 */
export async function sendAffiliatePayout(
  affiliateId: string,
  now = new Date(),
): Promise<PayoutResult> {
  if (!asaas().isConfigured) {
    throw new PayoutError(
      "Repasse automático desativado: configure ASAAS_API_KEY para enviar o Pix.",
    );
  }

  const [affiliate] = await db()
    .select({
      id: affiliates.id,
      name: affiliates.name,
      document: affiliates.document,
      pixKey: affiliates.pixKey,
      pixKeyType: affiliates.pixKeyType,
    })
    .from(affiliates)
    .where(eq(affiliates.id, affiliateId))
    .limit(1);

  if (!affiliate) throw new PayoutError("Afiliado não encontrado.");
  if (!affiliate.pixKey) {
    throw new PayoutError(
      "Afiliado sem chave Pix: peça a chave antes de enviar o repasse.",
    );
  }

  const commissions = await availableCommissions(affiliateId, now);
  const amountCents = sumCents(commissions);
  if (amountCents <= 0) {
    throw new PayoutError("Nenhuma comissão liberada para repasse.");
  }

  let payoutId: string;
  try {
    const [created] = await db()
      .insert(affiliatePayouts)
      .values({
        affiliateId,
        // O período começa na comissão mais antiga do lote; com o índice único
        // (afiliado, período), dois cliques não geram dois repasses.
        periodStart: isoDate(commissions[0].createdAt),
        periodEnd: isoDate(now),
        amountCents,
        status: "PENDENTE",
      })
      .returning({ id: affiliatePayouts.id });
    payoutId = created.id;
  } catch (error) {
    if (isUniqueViolation(error, "affiliate_payouts_period_key")) {
      throw new PayoutError(
        "Já existe um repasse para este período. Confira o histórico antes de reenviar.",
      );
    }
    throw error;
  }

  // Amarra exatamente as comissões somadas no valor. Um filtro por data
  // poderia pegar uma comissão que liberou entre o select e o update e pagar
  // menos do que o lote diz.
  await db()
    .update(affiliateCommissions)
    .set({ payoutId, updatedAt: new Date() })
    .where(
      inArray(
        affiliateCommissions.id,
        commissions.map((commission) => commission.id),
      ),
    );

  const transfer = await transferToAffiliate(
    { id: payoutId, amountCents },
    affiliate,
  );

  await db()
    .update(affiliatePayouts)
    .set({
      providerTransferId: transfer.providerTransferId,
      pixEndToEndId: transfer.endToEndId,
      updatedAt: new Date(),
    })
    .where(eq(affiliatePayouts.id, payoutId));

  return {
    payoutId,
    amountCents,
    providerTransferId: transfer.providerTransferId,
    providerStatus: transfer.status,
  };
}

/**
 * Reenvia um lote que falhou antes de o gateway aceitar. Se já existe id de
 * transferência, o gateway recebeu o pedido: reenviar poderia pagar duas vezes,
 * então a ação é recusada e o certo é esperar o webhook.
 */
export async function retryAffiliatePayout(
  payoutId: string,
): Promise<PayoutResult> {
  const [payout] = await db()
    .select()
    .from(affiliatePayouts)
    .where(eq(affiliatePayouts.id, payoutId))
    .limit(1);

  if (!payout) throw new PayoutError("Repasse não encontrado.");
  if (payout.status === "PAGO") throw new PayoutError("Repasse já foi pago.");
  if (payout.providerTransferId) {
    throw new PayoutError(
      "O gateway já recebeu este repasse. Aguarde a confirmação antes de reenviar.",
    );
  }

  const [affiliate] = await db()
    .select({
      id: affiliates.id,
      name: affiliates.name,
      document: affiliates.document,
      pixKey: affiliates.pixKey,
      pixKeyType: affiliates.pixKeyType,
    })
    .from(affiliates)
    .where(eq(affiliates.id, payout.affiliateId))
    .limit(1);

  if (!affiliate) throw new PayoutError("Afiliado não encontrado.");

  const transfer = await transferToAffiliate(
    { id: payout.id, amountCents: payout.amountCents },
    affiliate,
  );

  await db()
    .update(affiliatePayouts)
    .set({
      providerTransferId: transfer.providerTransferId,
      pixEndToEndId: transfer.endToEndId,
      failureReason: null,
      updatedAt: new Date(),
    })
    .where(eq(affiliatePayouts.id, payout.id));

  return {
    payoutId: payout.id,
    amountCents: payout.amountCents,
    providerTransferId: transfer.providerTransferId,
    providerStatus: transfer.status,
  };
}

type TransferRef = {
  providerTransferId: string;
  /** Nossos repasses são criados com `externalReference` = id do repasse. */
  externalReference?: string | null;
};

/** O id do gateway é a chave; o externalReference cobre webhook fora de ordem. */
async function findPayoutForTransfer({ providerTransferId, externalReference }: TransferRef) {
  const [byProvider] = await db()
    .select()
    .from(affiliatePayouts)
    .where(eq(affiliatePayouts.providerTransferId, providerTransferId))
    .limit(1);
  if (byProvider) return byProvider;
  if (!externalReference) return null;

  const [byReference] = await db()
    .select()
    .from(affiliatePayouts)
    .where(eq(affiliatePayouts.id, externalReference))
    .limit(1);
  return byReference ?? null;
}

/** Confirmação do gateway: aqui o dinheiro saiu e a comissão fecha. */
export async function confirmPayout(
  ref: TransferRef & { endToEndId?: string | null },
): Promise<void> {
  const payout = await findPayoutForTransfer(ref);
  if (!payout || payout.status === "PAGO") return;
  const endToEndId = ref.endToEndId;

  const paidAt = new Date();
  await db()
    .update(affiliatePayouts)
    .set({
      status: "PAGO",
      paidAt,
      pixEndToEndId: endToEndId ?? payout.pixEndToEndId,
      failureReason: null,
      updatedAt: paidAt,
    })
    .where(eq(affiliatePayouts.id, payout.id));

  await db()
    .update(affiliateCommissions)
    .set({ status: "PAGO", paidAt, updatedAt: paidAt })
    .where(eq(affiliateCommissions.payoutId, payout.id));
}

/** Falha no gateway: o lote é cancelado e as comissões voltam para a fila. */
export async function failPayout(
  ref: TransferRef & { reason: string },
): Promise<void> {
  const payout = await findPayoutForTransfer(ref);
  if (!payout || payout.status === "PAGO") return;
  const reason = ref.reason;

  await db()
    .update(affiliatePayouts)
    .set({ status: "CANCELADO", failureReason: reason, updatedAt: new Date() })
    .where(eq(affiliatePayouts.id, payout.id));

  await db()
    .update(affiliateCommissions)
    .set({ payoutId: null, updatedAt: new Date() })
    .where(eq(affiliateCommissions.payoutId, payout.id));
}
