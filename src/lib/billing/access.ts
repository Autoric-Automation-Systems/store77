import type {
  BillingMode,
  GrantType,
  SubscriptionStatus,
} from "@/db/schema";
import { FULL_ACCESS_GRACE_DAYS, POS_GRACE_DAYS } from "./plans.ts";

/**
 * Estado efetivo de acesso da loja.
 *
 * O gateway manda um `status`, mas ele pode atrasar: webhook perdido, reenvio
 * fora de ordem, fatura paga que ainda não chegou. Por isso o acesso não é lido
 * do status bruto — é derivado das datas da assinatura. O status só entra como
 * trava explícita (suspensão por abuso, cancelamento pedido).
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export type AccessState =
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "RESTRICTED"
  | "SUSPENDED"
  | "CANCELED";

export type AccessSubscription = {
  status: SubscriptionStatus;
  billingMode: BillingMode;
  grantType: GrantType;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  grantExpiresAt: Date | null;
  revokedAt: Date | null;
  cancelAtPeriodEnd: boolean;
  excludeFromMetrics: boolean;
};

export type Capabilities = {
  /** Registrar venda e operar o caixa. */
  usePos: boolean;
  /** Criar/editar produto, categoria e preço. */
  writeCatalog: boolean;
  /** Entrada, saída e ajuste de estoque. */
  writeStock: boolean;
  manageFinance: boolean;
  manageStorefront: boolean;
  manageTeam: boolean;
  cancelSales: boolean;
  inviteUsers: boolean;
  exportData: boolean;
  /** Vitrine pública continua no ar. */
  publishStorefront: boolean;
};

export type Access = {
  state: AccessState;
  /** Dias corridos desde o vencimento. `0` quando ainda não venceu. */
  daysLate: number;
  /** Fim do período atual. `null` em cortesia vitalícia. */
  periodEnd: Date | null;
  /** Motivo legível para a tela de assinatura e para o banner. */
  reason: string;
  isComplimentary: boolean;
  isLifetime: boolean;
  capabilities: Capabilities;
};

const ALL: Capabilities = {
  usePos: true,
  writeCatalog: true,
  writeStock: true,
  manageFinance: true,
  manageStorefront: true,
  manageTeam: true,
  cancelSales: true,
  inviteUsers: true,
  exportData: true,
  publishStorefront: true,
};

const READ_ONLY: Capabilities = {
  usePos: false,
  writeCatalog: false,
  writeStock: false,
  manageFinance: false,
  manageStorefront: false,
  manageTeam: false,
  cancelSales: false,
  inviteUsers: false,
  exportData: true,
  publishStorefront: false,
};

/** Ainda vende, mas não administra: cadastro, financeiro e equipe congelados. */
const POS_ONLY: Capabilities = {
  ...READ_ONLY,
  usePos: true,
  publishStorefront: true,
};

function build(
  state: AccessState,
  capabilities: Capabilities,
  reason: string,
  extra: Partial<Pick<Access, "daysLate" | "periodEnd" | "isComplimentary" | "isLifetime">> = {},
): Access {
  return {
    state,
    capabilities,
    reason,
    daysLate: extra.daysLate ?? 0,
    periodEnd: extra.periodEnd ?? null,
    isComplimentary: extra.isComplimentary ?? false,
    isLifetime: extra.isLifetime ?? false,
  };
}

export function resolveAccess(
  subscription: AccessSubscription,
  now: Date = new Date(),
): Access {
  const isComplimentary = subscription.billingMode === "COMPLIMENTARY";
  const base = {
    isComplimentary,
    periodEnd: subscription.currentPeriodEnd,
  };

  if (subscription.revokedAt) {
    return build(
      "SUSPENDED",
      READ_ONLY,
      "A cortesia desta loja foi revogada.",
      base,
    );
  }

  if (subscription.status === "SUSPENDED") {
    return build("SUSPENDED", READ_ONLY, "O acesso está suspenso.", base);
  }

  // Cortesia sem data de fim é vitalícia enquanto o produto existir.
  if (isComplimentary) {
    const endsAt = subscription.grantExpiresAt ?? subscription.currentPeriodEnd;
    if (!endsAt) {
      return build(
        "ACTIVE",
        ALL,
        "Cortesia vitalícia, sem cobrança.",
        { ...base, isLifetime: true },
      );
    }
    if (now <= endsAt) {
      return build("ACTIVE", ALL, "Cortesia válida, sem cobrança.", {
        ...base,
        periodEnd: endsAt,
      });
    }
    return lateState(endsAt, now, base, "A cortesia terminou.");
  }

  if (subscription.status === "CANCELED") {
    if (subscription.currentPeriodEnd && now <= subscription.currentPeriodEnd) {
      return build(
        "ACTIVE",
        ALL,
        "Assinatura cancelada; o acesso vale até o fim do período já pago.",
        base,
      );
    }
    return build("CANCELED", READ_ONLY, "A assinatura foi cancelada.", base);
  }

  if (subscription.cancelAtPeriodEnd) {
    const endsAt = subscription.currentPeriodEnd;
    if (endsAt && now > endsAt) {
      return build("CANCELED", READ_ONLY, "A assinatura foi cancelada.", base);
    }
  }

  const anchor =
    subscription.status === "TRIALING"
      ? subscription.trialEndsAt
      : subscription.currentPeriodEnd;

  // Sem data de fim em plano pago é erro de dados. Liberar é menos danoso do
  // que bloquear uma loja que está pagando; a tela de assinatura denuncia.
  if (!anchor) {
    return build("ACTIVE", ALL, "Assinatura sem data de renovação definida.", base);
  }

  if (now <= anchor) {
    return subscription.status === "TRIALING"
      ? build("TRIALING", ALL, "Período de teste em andamento.", {
          ...base,
          periodEnd: anchor,
        })
      : build("ACTIVE", ALL, "Assinatura em dia.", { ...base, periodEnd: anchor });
  }

  return lateState(
    anchor,
    now,
    base,
    subscription.status === "TRIALING"
      ? "O período de teste terminou."
      : "A fatura está em atraso.",
  );
}

function lateState(
  anchor: Date,
  now: Date,
  base: Pick<Access, "isComplimentary" | "periodEnd">,
  reason: string,
): Access {
  const daysLate = Math.floor((now.getTime() - anchor.getTime()) / DAY_MS);

  if (daysLate < FULL_ACCESS_GRACE_DAYS) {
    return build("PAST_DUE", ALL, `${reason} Você ainda tem acesso completo.`, {
      ...base,
      daysLate,
      periodEnd: anchor,
    });
  }

  if (daysLate < POS_GRACE_DAYS) {
    return build(
      "RESTRICTED",
      POS_ONLY,
      `${reason} O PDV e o caixa continuam funcionando; cadastro, financeiro e equipe estão bloqueados.`,
      { ...base, daysLate, periodEnd: anchor },
    );
  }

  return build(
    "SUSPENDED",
    READ_ONLY,
    `${reason} O acesso foi suspenso; os dados continuam disponíveis para exportação.`,
    { ...base, daysLate, periodEnd: anchor },
  );
}

/** Rótulos curtos para badge e banner. */
export const ACCESS_LABELS: Record<AccessState, string> = {
  TRIALING: "Teste",
  ACTIVE: "Ativa",
  PAST_DUE: "Pagamento pendente",
  RESTRICTED: "Acesso restrito",
  SUSPENDED: "Suspensa",
  CANCELED: "Cancelada",
};

export const ACCESS_TONES: Record<
  AccessState,
  "neutral" | "success" | "warning" | "danger" | "info"
> = {
  TRIALING: "info",
  ACTIVE: "success",
  PAST_DUE: "warning",
  RESTRICTED: "warning",
  SUSPENDED: "danger",
  CANCELED: "danger",
};
