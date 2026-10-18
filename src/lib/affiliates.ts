import { and, asc, desc, eq, inArray, lt, notExists, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  affiliateCommissions,
  affiliatePayouts,
  affiliateReferrals,
  affiliates,
  stores,
  subscriptions,
} from "@/db/schema";
import { affiliateCookieToken } from "./affiliate-cookies";
import { resolveAccess } from "./billing/access";
import { verifyAffiliateToken } from "./affiliate-session";
import { appBaseUrl } from "./url";

/** Afiliado ativo por 6 meses sem nenhuma indicação é removido. */
export const STALE_AFFILIATE_MONTHS = 6;

export type AffiliateIdentity = {
  id: string;
  name: string;
  email: string;
  code: string;
  status: (typeof affiliates.$inferSelect)["status"];
};

export const AFFILIATE_STATUS_LABELS: Record<
  (typeof affiliates.$inferSelect)["status"],
  string
> = {
  PENDENTE: "Em análise",
  ATIVO: "Ativo",
  SUSPENSO: "Suspenso",
  RECUSADO: "Recusado",
};

export const COMMISSION_STAGE_LABELS: Record<CommissionStage, string> = {
  PENDENTE: "Em retenção",
  DISPONIVEL: "Disponível",
  PAGO: "Pago",
  ESTORNADO: "Estornado",
};

export type CommissionStage = "PENDENTE" | "DISPONIVEL" | "PAGO" | "ESTORNADO";

/**
 * O status gravado só muda por estorno ou pagamento; a liberação é uma data.
 * Calcular o estágio na leitura evita um job diário só para virar a coluna e
 * mantém extrato e relatório sempre coerentes com `availableAt`.
 */
export function commissionStage(
  commission: { status: CommissionStage; availableAt: Date | null },
  now = new Date(),
): CommissionStage {
  if (commission.status !== "PENDENTE") return commission.status;
  return commission.availableAt && commission.availableAt <= now
    ? "DISPONIVEL"
    : "PENDENTE";
}

export async function getCurrentAffiliate(): Promise<AffiliateIdentity | null> {
  const token = await affiliateCookieToken();
  const id = await verifyAffiliateToken(token);
  if (!id) return null;

  const [row] = await db()
    .select({
      id: affiliates.id,
      name: affiliates.name,
      email: affiliates.email,
      code: affiliates.code,
      status: affiliates.status,
    })
    .from(affiliates)
    .where(eq(affiliates.id, id))
    .limit(1);

  if (!row) return null;
  // Suspenso e recusado continuam com o cadastro, mas perdem o acesso.
  if (row.status === "SUSPENSO" || row.status === "RECUSADO") return null;
  return row;
}

export async function requireAffiliate(): Promise<AffiliateIdentity> {
  const affiliate = await getCurrentAffiliate();
  if (!affiliate) redirect("/afiliados/entrar?next=/afiliados/painel");
  return affiliate;
}

/**
 * O link divulgado abre uma página de vendas com o CTA de cadastro já
 * atribuído — em vez de mandar o visitante direto ao formulário.
 */
export function referralLink(code: string): string {
  return `${appBaseUrl()}/afiliados/${code}`;
}

export function referralSignupHref(code: string): string {
  return `/cadastro?ref=${encodeURIComponent(code)}`;
}

/**
 * Código de indicação curto: 8 caracteres. O alfabeto exclui vogais (o código
 * não forma palavra nem sugere o nome do afiliado) e os pares ambíguos
 * 0/o/1/l/i — sobra o que dá para ditar no telefone e caber em bio.
 * "cadastro", "entrar" e "painel" são as rotas fixas da área; nenhuma delas é
 * representável aqui, porque todas usam vogais.
 */
const CODE_ALPHABET = "23456789bcdfghjkmnpqrstvwxz";
const CODE_LENGTH = 8;

function randomAffiliateCode(): string {
  const drawn = crypto.getRandomValues(new Uint32Array(CODE_LENGTH));
  return Array.from(drawn, (n) => CODE_ALPHABET[n % CODE_ALPHABET.length]).join("");
}

export async function generateAffiliateCode(): Promise<string> {
  // Com 30^8 combinações a colisão é improvável, mas o índice único decide.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = randomAffiliateCode();
    const [taken] = await db()
      .select({ id: affiliates.id })
      .from(affiliates)
      .where(sql`lower(${affiliates.code}) = ${candidate}`)
      .limit(1);
    if (!taken) return candidate;
  }
  return randomAffiliateCode();
}

/** Códigos antigos (derivados do nome) continuam válidos, mas não são curtos. */
export function isShortAffiliateCode(code: string): boolean {
  return (
    code.length === CODE_LENGTH &&
    [...code].every((letter) => CODE_ALPHABET.includes(letter))
  );
}

export async function findAffiliateByEmail(email: string) {
  const [row] = await db()
    .select()
    .from(affiliates)
    .where(sql`lower(${affiliates.email}) = ${email.trim().toLowerCase()}`)
    .limit(1);
  return row ?? null;
}

/** Só afiliado ativo atribui loja: suspenso não captura indicação nova. */
export async function findActiveAffiliateByCode(code: string) {
  const [row] = await db()
    .select()
    .from(affiliates)
    .where(
      and(
        sql`lower(${affiliates.code}) = ${code.trim().toLowerCase()}`,
        eq(affiliates.status, "ATIVO"),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Registra o vínculo loja -> afiliado. A loja tem no máximo um afiliado de
 * origem, então o índice único em `store_id` resolve a corrida: a primeira
 * indicação registrada vence.
 */
export async function attributeReferral(input: {
  storeId: string;
  code: string;
  affiliateId: string;
}): Promise<void> {
  await db()
    .insert(affiliateReferrals)
    .values({
      storeId: input.storeId,
      affiliateId: input.affiliateId,
      code: input.code,
    })
    .onConflictDoNothing();
}

export type AffiliateDashboard = Awaited<ReturnType<typeof affiliateDashboard>>;

export async function affiliateDashboard(affiliateId: string) {
  const [referrals, subscriptionRows, commissions, payouts] = await Promise.all([
    db()
      .select({
        storeId: affiliateReferrals.storeId,
        storeName: stores.name,
        storeSlug: stores.slug,
        attributedAt: affiliateReferrals.attributedAt,
        convertedAt: affiliateReferrals.convertedAt,
      })
      .from(affiliateReferrals)
      .innerJoin(stores, eq(stores.id, affiliateReferrals.storeId))
      .where(eq(affiliateReferrals.affiliateId, affiliateId))
      .orderBy(desc(affiliateReferrals.attributedAt)),
    // A situação de acesso é derivada do relógio: não existe como coluna.
    db()
      .select()
      .from(subscriptions)
      .where(
        inArray(
          subscriptions.storeId,
          db()
            .select({ storeId: affiliateReferrals.storeId })
            .from(affiliateReferrals)
            .where(eq(affiliateReferrals.affiliateId, affiliateId)),
        ),
      ),
    db()
      .select({
        id: affiliateCommissions.id,
        storeName: stores.name,
        baseAmountCents: affiliateCommissions.baseAmountCents,
        rateBp: affiliateCommissions.rateBp,
        amountCents: affiliateCommissions.amountCents,
        status: affiliateCommissions.status,
        availableAt: affiliateCommissions.availableAt,
        paidAt: affiliateCommissions.paidAt,
        createdAt: affiliateCommissions.createdAt,
      })
      .from(affiliateCommissions)
      .innerJoin(stores, eq(stores.id, affiliateCommissions.storeId))
      .where(eq(affiliateCommissions.affiliateId, affiliateId))
      .orderBy(desc(affiliateCommissions.createdAt)),
    db()
      .select()
      .from(affiliatePayouts)
      .where(eq(affiliatePayouts.affiliateId, affiliateId))
      .orderBy(desc(affiliatePayouts.periodStart)),
  ]);

  const now = new Date();
  const totals: Record<CommissionStage, number> = {
    PENDENTE: 0,
    DISPONIVEL: 0,
    PAGO: 0,
    ESTORNADO: 0,
  };

  for (const commission of commissions) {
    totals[commissionStage(commission, now)] += commission.amountCents;
  }

  const subscriptionByStore = new Map(
    subscriptionRows.map((row) => [row.storeId, row]),
  );

  return {
    referrals: referrals.map((referral) => {
      const subscription = subscriptionByStore.get(referral.storeId);
      return {
        ...referral,
        planCode: subscription?.planCode ?? null,
        accessState: subscription ? resolveAccess(subscription, now).state : null,
      };
    }),
    commissions: commissions.map((commission) => ({
      ...commission,
      stage: commissionStage(commission, now),
    })),
    payouts,
    totals,
  };
}

/** Meia-noite de N meses atrás, com o dia limitado ao último do mês. */
export function monthsAgo(months: number, now = new Date()): Date {
  const result = new Date(now);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() - months);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

const staleFilter = (cutoff: Date) =>
  and(
    lt(affiliates.createdAt, cutoff),
    notExists(
      db()
        .select({ one: sql`1` })
        .from(affiliateReferrals)
        .where(eq(affiliateReferrals.affiliateId, affiliates.id)),
    ),
  );

export async function staleAffiliates(now = new Date()) {
  return db()
    .select({
      id: affiliates.id,
      name: affiliates.name,
      email: affiliates.email,
      status: affiliates.status,
      createdAt: affiliates.createdAt,
    })
    .from(affiliates)
    .where(staleFilter(monthsAgo(STALE_AFFILIATE_MONTHS, now)))
    .orderBy(asc(affiliates.createdAt));
}

/** Apaga os cadastros vencidos; comissões e repasses caem junto por cascade. */
export async function purgeStaleAffiliates(now = new Date()): Promise<number> {
  const removed = await db()
    .delete(affiliates)
    .where(staleFilter(monthsAgo(STALE_AFFILIATE_MONTHS, now)))
    .returning({ id: affiliates.id });
  return removed.length;
}

export type AdminAffiliateRow = Awaited<
  ReturnType<typeof adminAffiliateList>
>[number];

export async function adminAffiliateList() {
  const [rows, referralRows, commissionRows] = await Promise.all([
    db().select().from(affiliates).orderBy(desc(affiliates.createdAt)),
    db()
      .select({
        affiliateId: affiliateReferrals.affiliateId,
        total: sql<number>`count(*)::int`,
        converted: sql<number>`count(${affiliateReferrals.convertedAt})::int`,
      })
      .from(affiliateReferrals)
      .groupBy(affiliateReferrals.affiliateId),
    // `PENDENTE` guarda dois estados que o relógio separa: em retenção e já
    // liberado. Agrupar por isso evita que a lista diga que há R$ 0 disponível
    // enquanto a fila de repasse mostra saldo.
    db()
      .select({
        affiliateId: affiliateCommissions.affiliateId,
        status: affiliateCommissions.status,
        released: sql<boolean>`${affiliateCommissions.availableAt} <= now()`,
        amount: sql<number>`coalesce(sum(${affiliateCommissions.amountCents}), 0)::int`,
      })
      .from(affiliateCommissions)
      .groupBy(
        affiliateCommissions.affiliateId,
        affiliateCommissions.status,
        sql`${affiliateCommissions.availableAt} <= now()`,
      ),
  ]);

  const referralMap = new Map(referralRows.map((row) => [row.affiliateId, row]));

  return rows.map((affiliate) => {
    const referral = referralMap.get(affiliate.id);
    const commissions = commissionRows.filter(
      (row) => row.affiliateId === affiliate.id,
    );
    const sumWhere = (predicate: (row: (typeof commissions)[number]) => boolean) =>
      commissions.filter(predicate).reduce((total, row) => total + row.amount, 0);

    return {
      ...affiliate,
      referralCount: referral?.total ?? 0,
      convertedCount: referral?.converted ?? 0,
      pendingCents: sumWhere(
        (row) => row.status === "PENDENTE" && !row.released,
      ),
      availableCents: sumWhere(
        (row) => row.status === "PENDENTE" && row.released,
      ),
      paidCents: sumWhere((row) => row.status === "PAGO"),
      refundedCents: sumWhere((row) => row.status === "ESTORNADO"),
    };
  });
}

export async function adminAffiliateDetail(affiliateId: string) {
  const [affiliate] = await db()
    .select()
    .from(affiliates)
    .where(eq(affiliates.id, affiliateId))
    .limit(1);
  if (!affiliate) return null;

  const dashboard = await affiliateDashboard(affiliateId);
  return { affiliate, ...dashboard };
}
