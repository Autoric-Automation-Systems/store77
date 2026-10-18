import Link from "next/link";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui";
import {
  ADDONS,
  COMMISSION_HOLD_DAYS,
  DEFAULT_COMMISSION_BP,
  DEFAULT_COMMISSION_MONTHS,
  FULL_ACCESS_GRACE_DAYS,
  NO_ADDONS,
  PLANS,
  POS_GRACE_DAYS,
  PRICE_VERSION,
  TRIAL_DAYS,
  monthlyEquivalentCents,
  monthlyTotalCents,
} from "@/lib/billing/plans";
import { formatBRL } from "@/lib/format";
import { requirePlatformAdmin } from "@/lib/platform";

export const dynamic = "force-dynamic";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-ink-900">{value}</dd>
    </div>
  );
}

export default async function AdminPlansPage() {
  await requirePlatformAdmin();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Planos"
        description="Catálogo em vigor. Preço é regra versionada, não campo editável."
        action={<Badge tone="info">versão {PRICE_VERSION}</Badge>}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {PLANS.map((plan) => (
          <Card key={plan.code} className="card-pad">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-ink-900">
                  {plan.name}
                </h2>
                <p className="mt-0.5 text-sm text-ink-500">{plan.tagline}</p>
              </div>
              <Badge tone={plan.isPublic ? "success" : "neutral"}>
                {plan.isPublic ? "na vitrine" : "interno"}
              </Badge>
            </div>

            <p className="mt-4 text-2xl font-bold text-ink-900">
              {plan.monthlyCents === 0
                ? "Cortesia"
                : `${formatBRL(plan.monthlyCents)}/mês`}
            </p>
            {plan.monthlyCents > 0 ? (
              <p className="text-sm text-ink-500">
                {formatBRL(plan.annualCents)}/ano ·{" "}
                {formatBRL(monthlyEquivalentCents(plan, NO_ADDONS, "YEARLY"))}
                /mês no anual
              </p>
            ) : null}

            <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-ink-100 pt-4">
              <Metric label="Assentos" value={String(plan.includedSeats)} />
              <Metric
                label="Vendas/mês"
                value={plan.includedSalesPerMonth.toLocaleString("pt-BR")}
              />
              <Metric label="Lojas" value={String(plan.includedStores)} />
            </dl>

            <ul className="mt-4 space-y-1 text-sm text-ink-600">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <span aria-hidden className="text-ink-300">
                    ·
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Adicionais"
            description="Somam ao plano, mês a mês. No anual o desconto vale para eles também."
          />
          <ul className="divide-y divide-ink-100">
            {Object.entries(ADDONS).map(([key, addon]) => (
              <li
                key={key}
                className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
              >
                <span className="text-ink-700">
                  {addon.label}
                  {"sales" in addon ? (
                    <span className="text-ink-500">
                      {" "}
                      ({addon.sales.toLocaleString("pt-BR")} vendas)
                    </span>
                  ) : null}
                </span>
                <span className="font-semibold text-ink-900">
                  {formatBRL(addon.monthlyCents)}/mês
                </span>
              </li>
            ))}
          </ul>
          <p className="border-t border-ink-100 px-5 py-3 text-xs text-ink-500">
            Exemplo: Essencial + 1 assento sai por{" "}
            {
              formatBRL(
                monthlyTotalCents(PLANS[0], { ...NO_ADDONS, extraSeats: 1 }),
              )
            }
            /mês.
          </p>
        </Card>

        <Card>
          <CardHeader
            title="Regras de cobrança"
            description="Prazos que o sistema aplica sozinho, sem intervenção do suporte."
          />
          <ul className="divide-y divide-ink-100 text-sm">
            <li className="flex items-center justify-between gap-3 px-5 py-3">
              <span className="text-ink-700">Teste sem cartão</span>
              <span className="font-semibold">{TRIAL_DAYS} dias</span>
            </li>
            <li className="flex items-center justify-between gap-3 px-5 py-3">
              <span className="text-ink-700">Acesso completo após vencer</span>
              <span className="font-semibold">{FULL_ACCESS_GRACE_DAYS} dias</span>
            </li>
            <li className="flex items-center justify-between gap-3 px-5 py-3">
              <span className="text-ink-700">PDV segue até a suspensão</span>
              <span className="font-semibold">{POS_GRACE_DAYS} dias</span>
            </li>
            <li className="flex items-center justify-between gap-3 px-5 py-3">
              <span className="text-ink-700">Comissão do afiliado</span>
              <span className="font-semibold">
                {DEFAULT_COMMISSION_BP / 100}% por {DEFAULT_COMMISSION_MONTHS}{" "}
                meses
              </span>
            </li>
            <li className="flex items-center justify-between gap-3 px-5 py-3">
              <span className="text-ink-700">Retenção antes do repasse</span>
              <span className="font-semibold">{COMMISSION_HOLD_DAYS} dias</span>
            </li>
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Como alterar um preço"
          description="O catálogo é código: mudar valor exige deploy e nova versão."
        />
        <ol className="list-decimal space-y-2 px-5 py-4 pl-9 text-sm text-ink-600">
          <li>
            Ajuste <code className="text-ink-800">src/lib/billing/plans.ts</code>{" "}
            e suba <code className="text-ink-800">PRICE_VERSION</code>.
          </li>
          <li>
            Assinaturas existentes mantêm o preço da contratação; a fatura
            guarda o valor cobrado como snapshot.
          </li>
          <li>
            Lojas novas passam a contratar pelo catálogo novo.{" "}
            <Link href="/admin/lojas" className="text-brand-700 underline">
              Ver lojas
            </Link>
          </li>
        </ol>
      </Card>
    </div>
  );
}
