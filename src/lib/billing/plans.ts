/**
 * Catálogo de planos do Store77.
 *
 * Fonte única de verdade para preço e limite. Fica no código, e não no banco,
 * porque preço é regra de negócio versionada: a fatura guarda o valor cobrado
 * como snapshot e o catálogo diz o que vale a partir de cada deploy.
 *
 * Preço é sempre inteiro em centavos.
 */

export const PRICE_VERSION = "2026-10";

/** Desconto do plano anual: 20% sobre 12 meses. */
export const ANNUAL_DISCOUNT_BP = 2000;

/** 14 dias sem cartão. */
export const TRIAL_DAYS = 14;

/** Dias de acesso completo depois do vencimento, antes de restringir. */
export const FULL_ACCESS_GRACE_DAYS = 7;

/** Dias até a suspensão. Até lá o PDV continua funcionando. */
export const POS_GRACE_DAYS = 30;

/** Comissão padrão do afiliado: 25% da fatura paga, por 12 meses. */
export const DEFAULT_COMMISSION_BP = 2500;
export const DEFAULT_COMMISSION_MONTHS = 12;

/** Carência entre o pagamento e a liberação da comissão, para cobrir estornos. */
export const COMMISSION_HOLD_DAYS = 30;

export const PLAN_CODES = [
  "ESSENCIAL",
  "LOJA",
  "EQUIPE",
  "REDE",
  "CORPORATIVO",
  "CORTESIA",
  "LEGACY",
] as const;

export type PlanCode = (typeof PLAN_CODES)[number];

export type Plan = {
  code: PlanCode;
  name: string;
  tagline: string;
  monthlyCents: number;
  annualCents: number;
  includedSeats: number;
  includedSalesPerMonth: number;
  includedStores: number;
  /** `false` = não aparece na vitrine de planos nem aceita contratação própria. */
  isPublic: boolean;
  sortOrder: number;
  features: string[];
};

/** Preço anual com 20% de desconto, arredondado para os 10 centavos. */
export function annualFromMonthly(monthlyCents: number): number {
  const discounted = monthlyCents * 12 * ((10_000 - ANNUAL_DISCOUNT_BP) / 10_000);
  return Math.round(discounted / 10) * 10;
}

function plan(input: Omit<Plan, "annualCents"> & { annualCents?: number }): Plan {
  return {
    ...input,
    annualCents: input.annualCents ?? annualFromMonthly(input.monthlyCents),
  };
}

/**
 * O Essencial é a âncora de preço; os demais derivam dela em múltiplos
 * (2x, 4x, 7x e 13,5x) e são arredondados para o preço comercial terminado em
 * ,90. Plano novo entra nessa lógica, não como valor solto.
 *
 * A escada de assentos é 1, 3, 8, 20 e 50: o preço por usuário cai de R$ 19,90
 * para R$ 5,40, então subir de plano sempre sai mais barato do que empilhar
 * assentos avulsos. O assento extra fica entre esses dois extremos: resolve o
 * "só preciso de mais uma pessoa" sem virar uma forma de remontar o catálogo.
 */
export const PLANS: readonly Plan[] = [
  plan({
    code: "ESSENCIAL",
    name: "Essencial",
    tagline: "Para quem vende sozinho, no balcão ou pelo WhatsApp.",
    monthlyCents: 1990,
    includedSeats: 1,
    includedSalesPerMonth: 500,
    includedStores: 1,
    isPublic: true,
    sortOrder: 1,
    features: [
      "Estoque com fotos e código de barras",
      "PDV com sessão de caixa",
      "Financeiro e contas a pagar/receber",
      "Vitrine online com pedido pelo WhatsApp",
      "1 usuário ativo: o proprietário",
      "Até 500 vendas por mês",
    ],
  }),
  plan({
    code: "LOJA",
    name: "Loja",
    tagline: "Para a loja de bairro com você e mais duas pessoas.",
    monthlyCents: 3990,
    includedSeats: 3,
    includedSalesPerMonth: 1500,
    includedStores: 1,
    isPublic: true,
    sortOrder: 2,
    features: [
      "Tudo do Essencial",
      "3 usuários ativos",
      "Até 1.500 vendas por mês",
      "Suporte prioritário por e-mail",
    ],
  }),
  plan({
    code: "EQUIPE",
    name: "Equipe",
    tagline: "Para lojas com vários caixas e gerente.",
    monthlyCents: 7990,
    includedSeats: 8,
    includedSalesPerMonth: 5000,
    includedStores: 1,
    isPublic: true,
    sortOrder: 3,
    features: [
      "Tudo do Loja",
      "8 usuários ativos",
      "Até 5.000 vendas por mês",
      "Suporte prioritário com apoio na configuração da equipe",
    ],
  }),
  plan({
    code: "REDE",
    name: "Rede",
    tagline: "Para duas ou três lojas sob a mesma gestão.",
    monthlyCents: 13990,
    includedSeats: 20,
    includedSalesPerMonth: 12000,
    includedStores: 3,
    isPublic: true,
    sortOrder: 4,
    features: [
      "Tudo do Equipe",
      "20 usuários ativos",
      "Até 12.000 vendas por mês",
      "3 lojas no contrato, habilitadas pelo suporte",
      "Visão consolidada entre unidades",
    ],
  }),
  plan({
    code: "CORPORATIVO",
    name: "Corporativo",
    tagline: "Para redes com 50 ou mais funcionários.",
    monthlyCents: 26990,
    includedSeats: 50,
    includedSalesPerMonth: 30000,
    includedStores: 10,
    isPublic: true,
    sortOrder: 5,
    features: [
      "Tudo do Rede",
      "50 usuários ativos",
      "Até 30.000 vendas por mês",
      "10 lojas no contrato, habilitadas pelo suporte",
      "Onboarding assistido e canal direto de suporte",
    ],
  }),
  plan({
    code: "CORTESIA",
    name: "Cortesia",
    tagline: "Concessão interna: presente, parceria ou uso do próprio time.",
    monthlyCents: 0,
    annualCents: 0,
    includedSeats: 8,
    includedSalesPerMonth: 5000,
    includedStores: 3,
    isPublic: false,
    sortOrder: 90,
    features: [
      "Mesmos módulos do plano Equipe",
      "Sem cobrança enquanto a cortesia estiver válida",
      "Fora dos indicadores de receita",
    ],
  }),
  plan({
    code: "LEGACY",
    name: "Legado",
    tagline: "Lojas criadas antes da cobrança, durante a migração assistida.",
    monthlyCents: 0,
    annualCents: 0,
    includedSeats: 20,
    includedSalesPerMonth: 12000,
    includedStores: 3,
    isPublic: false,
    sortOrder: 91,
    features: [
      "Mesmos módulos do plano Rede",
      "Cortesia de migração por tempo limitado",
    ],
  }),
];

export const PUBLIC_PLANS = PLANS.filter((item) => item.isPublic).sort(
  (a, b) => a.sortOrder - b.sortOrder,
);

export function findPlan(code: string): Plan | null {
  return PLANS.find((item) => item.code === code) ?? null;
}

export function findPublicPlan(code: string): Plan | null {
  const found = findPlan(code);
  return found?.isPublic ? found : null;
}

/** Adicionais cobrados por mês, além do plano. */
export const ADDONS = {
  seat: { label: "Usuário extra", monthlyCents: 790 },
  store: { label: "Loja extra", monthlyCents: 2690 },
  salesPack: {
    label: "Pacote de 5.000 vendas",
    monthlyCents: 1290,
    sales: 5000,
  },
} as const;

export type SubscriptionAddons = {
  extraSeats: number;
  extraStores: number;
  extraSalesPacks: number;
};

export const NO_ADDONS: SubscriptionAddons = {
  extraSeats: 0,
  extraStores: 0,
  extraSalesPacks: 0,
};

export function addonsOf(subscription: {
  extraSeats: number;
  extraStores: number;
  extraSalesPacks: number;
}): SubscriptionAddons {
  return {
    extraSeats: subscription.extraSeats,
    extraStores: subscription.extraStores,
    extraSalesPacks: subscription.extraSalesPacks,
  };
}

export type PlanLimits = {
  seats: number;
  salesPerMonth: number;
  stores: number;
};

export function limitsFor(plan: Plan, addons: SubscriptionAddons): PlanLimits {
  return {
    seats: plan.includedSeats + Math.max(0, addons.extraSeats),
    salesPerMonth:
      plan.includedSalesPerMonth +
      Math.max(0, addons.extraSalesPacks) * ADDONS.salesPack.sales,
    stores: plan.includedStores + Math.max(0, addons.extraStores),
  };
}

/** Valor mensal do plano + adicionais. */
export function monthlyTotalCents(
  plan: Plan,
  addons: SubscriptionAddons,
): number {
  return (
    plan.monthlyCents +
    Math.max(0, addons.extraSeats) * ADDONS.seat.monthlyCents +
    Math.max(0, addons.extraStores) * ADDONS.store.monthlyCents +
    Math.max(0, addons.extraSalesPacks) * ADDONS.salesPack.monthlyCents
  );
}

/**
 * Valor da fatura. No anual o desconto vale também para os adicionais, para
 * não existir o caso de um adicional custar mais que o próprio plano.
 */
export function periodTotalCents(
  plan: Plan,
  addons: SubscriptionAddons,
  interval: "MONTHLY" | "YEARLY",
): number {
  if (interval === "MONTHLY") return monthlyTotalCents(plan, addons);
  const addonsMonthly = monthlyTotalCents(plan, addons) - plan.monthlyCents;
  return plan.annualCents + annualFromMonthly(addonsMonthly);
}

export function monthlyEquivalentCents(
  plan: Plan,
  addons: SubscriptionAddons,
  interval: "MONTHLY" | "YEARLY",
): number {
  if (interval === "MONTHLY") return monthlyTotalCents(plan, addons);
  return Math.round(periodTotalCents(plan, addons, interval) / 12);
}

/**
 * Assentos contam apenas quem opera a loja. `CLIENTE` é consumidor da vitrine,
 * não funcionário, e por isso não ocupa assento.
 */
export const SEAT_ROLES = ["OWNER", "GERENTE", "VENDEDOR", "CAIXA"] as const;
