import Link from "next/link";
import type { BillingOverview } from "@/lib/billing/entitlements";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Aviso persistente de cobrança no topo do app.
 *
 * Só aparece quando há algo a fazer: teste acabando, fatura em atraso, acesso
 * restrito, suspenso ou uso perto do limite do plano. Loja em dia não vê
 * banner — cobrança não é conteúdo.
 */
export function BillingBanner({ overview }: { overview: BillingOverview }) {
  const { access, limits, salesThisMonth } = overview;
  const usageRatio = limits.salesPerMonth
    ? salesThisMonth / limits.salesPerMonth
    : 0;

  let tone: string;
  if (access.state === "PAST_DUE" || usageRatio >= 0.8) {
    tone = "border-amber-200 bg-amber-50 text-amber-900";
  } else if (access.state === "TRIALING") {
    tone = "border-brand-200 bg-brand-50 text-brand-800";
  } else {
    tone = "border-red-200 bg-red-50 text-red-800";
  }

  let message: string | null = null;

  if (access.state === "TRIALING" && access.periodEnd) {
    const daysLeft = Math.ceil(
      (access.periodEnd.getTime() - Date.now()) / DAY_MS,
    );
    if (daysLeft <= 5) {
      message =
        daysLeft <= 0
          ? "Seu período de teste terminou hoje."
          : `Faltam ${daysLeft} ${daysLeft === 1 ? "dia" : "dias"} de teste.`;
    }
  } else if (access.state === "PAST_DUE") {
    message =
      "A fatura da assinatura está em atraso. Regularize para não perder recursos.";
  } else if (access.state === "RESTRICTED") {
    message =
      "Acesso restrito: o PDV funciona, mas cadastros, financeiro e equipe estão bloqueados.";
  } else if (access.state === "SUSPENDED") {
    message =
      "Acesso suspenso. Seus dados estão guardados; fale com o suporte para reativar.";
  } else if (access.state === "CANCELED") {
    message =
      "Assinatura cancelada. Seus dados estão guardados; você pode reativar quando quiser.";
  } else if (usageRatio >= 1) {
    message = `Você passou das ${limits.salesPerMonth.toLocaleString("pt-BR")} vendas incluídas neste mês (${salesThisMonth.toLocaleString("pt-BR")}). As vendas continuam registrando; considere um pacote extra.`;
  } else if (usageRatio >= 0.8) {
    message = `Você já usou ${salesThisMonth.toLocaleString("pt-BR")} das ${limits.salesPerMonth.toLocaleString("pt-BR")} vendas incluídas neste mês.`;
  }

  if (!message) return null;

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${tone}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p>{message}</p>
        <Link
          href="/assinatura"
          className="font-semibold underline underline-offset-2"
        >
          Ver assinatura
        </Link>
      </div>
    </div>
  );
}
