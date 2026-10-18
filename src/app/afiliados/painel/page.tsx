import Link from "next/link";
import { HandCoins, Link2, ShoppingBag, Wallet } from "lucide-react";
import { CopyField } from "@/components/copy-field";
import { Alert, Badge, Card, CardHeader, EmptyState, PageHeader, Stat } from "@/components/ui";
import {
  affiliateDashboard,
  COMMISSION_STAGE_LABELS,
  referralLink,
  requireAffiliate,
} from "@/lib/affiliates";
import { COMMISSION_HOLD_DAYS, DEFAULT_COMMISSION_MONTHS } from "@/lib/billing/plans";
import { formatBRL, formatDate, formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const STAGE_TONES = {
  PENDENTE: "warning",
  DISPONIVEL: "success",
  PAGO: "info",
  ESTORNADO: "danger",
} as const;

const ACCESS_LABELS: Record<string, string> = {
  TRIALING: "Em teste",
  ACTIVE: "Ativa",
  GRACE: "Pagamento atrasado",
  RESTRICTED: "Gestão bloqueada",
  SUSPENDED: "Suspensa",
  CANCELED: "Cancelada",
};

export default async function AffiliatePanelPage({
  searchParams,
}: {
  searchParams: Promise<{ novo?: string }>;
}) {
  const affiliate = await requireAffiliate();
  const { novo } = await searchParams;
  const data = await affiliateDashboard(affiliate.id);
  const link = referralLink(affiliate.code);

  const converted = data.referrals.filter((item) => item.convertedAt).length;

  return (
    <div className="space-y-8">
      {novo ? (
        <Alert tone="success">
          Cadastro criado. Seu link já está ativo — pode divulgar agora.
        </Alert>
      ) : null}

      <PageHeader
        title={`Olá, ${affiliate.name.split(" ")[0]}`}
        description="Seu link, suas indicações e o extrato de comissões."
      />

      <Card className="card-pad">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <Link2 className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink-900">Seu link de indicação</p>
            <p className="mt-1 text-sm text-ink-500">
              Código <strong className="text-ink-800">{affiliate.code}</strong>.
              O link abre uma página de apresentação do Store77 com o seu código
              embutido; quem se cadastrar por ela fica vinculado a você.
            </p>
            <div className="mt-3">
              <CopyField value={link} label="Link de indicação" />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Indicações"
          value={String(data.referrals.length)}
          hint={`${converted} já pagaram`}
          tone="info"
        />
        <Stat
          label="Disponível para saque"
          value={formatBRL(data.totals.DISPONIVEL)}
          hint={`Após ${COMMISSION_HOLD_DAYS} dias`}
          tone="success"
        />
        <Stat
          label="Em retenção"
          value={formatBRL(data.totals.PENDENTE)}
          hint="Aguardando liberação"
          tone="warning"
        />
        <Stat
          label="Já pago"
          value={formatBRL(data.totals.PAGO)}
          hint="Total recebido"
          tone="info"
        />
      </div>

      <Card>
        <CardHeader
          title="Lojas indicadas"
          description="Cada loja tem um único afiliado de origem: vale a primeira indicação."
          action={<Badge>{data.referrals.length}</Badge>}
        />
        {data.referrals.length === 0 ? (
          <EmptyState
            title="Nenhuma indicação ainda"
            description="Divulgue seu link. A loja aparece aqui assim que se cadastrar por ele, mesmo antes de pagar."
            action={
              <Link href="/ajuda/planos" className="btn btn-secondary">
                Ver planos e preços
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-ink-200 text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">Loja</th>
                  <th className="px-4 py-3">Plano</th>
                  <th className="px-4 py-3">Situação</th>
                  <th className="px-4 py-3">Indicada em</th>
                  <th className="px-4 py-3">1º pagamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {data.referrals.map((referral) => (
                  <tr key={referral.storeId}>
                    <td className="px-4 py-3 font-medium text-ink-800">
                      {referral.storeName}
                    </td>
                    <td className="px-4 py-3 text-ink-700">
                      {referral.planCode ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      {referral.accessState ? (
                        <Badge
                          tone={referral.accessState === "ACTIVE" ? "success" : "neutral"}
                        >
                          {ACCESS_LABELS[referral.accessState] ??
                            referral.accessState}
                        </Badge>
                      ) : (
                        <span className="text-ink-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      {formatDate(referral.attributedAt)}
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      {referral.convertedAt ? (
                        formatDate(referral.convertedAt)
                      ) : (
                        <span className="text-ink-400">Ainda não</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Extrato de comissões"
          description={`Comissão de até ${DEFAULT_COMMISSION_MONTHS} faturas por loja, liberada ${COMMISSION_HOLD_DAYS} dias após o pagamento.`}
          action={
            <Badge tone="neutral">
              <ShoppingBag className="mr-1 inline size-3.5" />
              {data.commissions.length}
            </Badge>
          }
        />
        {data.commissions.length === 0 ? (
          <EmptyState
            title="Sem comissões ainda"
            description="A comissão nasce quando a loja indicada paga a primeira fatura. Teste grátis e cortesia não geram comissão."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-ink-200 text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Loja</th>
                  <th className="px-4 py-3 text-right">Fatura</th>
                  <th className="px-4 py-3 text-right">%</th>
                  <th className="px-4 py-3 text-right">Comissão</th>
                  <th className="px-4 py-3">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {data.commissions.map((commission) => (
                  <tr key={commission.id}>
                    <td className="px-4 py-3 text-ink-600">
                      {formatDate(commission.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-ink-800">
                      {commission.storeName}
                    </td>
                    <td className="px-4 py-3 text-right text-ink-700">
                      {formatBRL(commission.baseAmountCents)}
                    </td>
                    <td className="px-4 py-3 text-right text-ink-600">
                      {(commission.rateBp / 100).toFixed(2).replace(".", ",")}%
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-ink-900">
                      {formatBRL(commission.amountCents)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={STAGE_TONES[commission.stage]}>
                        {COMMISSION_STAGE_LABELS[commission.stage]}
                      </Badge>
                      {commission.stage === "PENDENTE" && commission.availableAt ? (
                        <p className="mt-1 text-xs text-ink-500">
                          libera {formatDate(commission.availableAt)}
                        </p>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Repasses"
          description="Pix enviado pelo suporte até o dia 10 do mês seguinte, com saldo mínimo de R$ 50,00."
        />
        {data.payouts.length === 0 ? (
          <EmptyState
            title="Nenhum repasse ainda"
            description="O primeiro repasse acontece quando houver saldo disponível suficiente no fechamento do mês."
          />
        ) : (
          <ul className="divide-y divide-ink-100">
            {data.payouts.map((payout) => (
              <li
                key={payout.id}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"
              >
                <span className="font-medium text-ink-800">
                  {formatDate(payout.periodStart)} a{" "}
                  {formatDate(payout.periodEnd)}
                </span>
                <span className="text-ink-600">{formatBRL(payout.amountCents)}</span>
                <Badge
                  tone={payout.status === "PAGO" ? "success" : "warning"}
                >
                  {payout.status === "PAGO" ? "Pago" : "Em processamento"}
                </Badge>
                <span className="w-full text-xs text-ink-500 sm:w-auto">
                  {payout.paidAt
                    ? `Pago em ${formatDateTime(payout.paidAt)}`
                    : "Aguardando pagamento"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="rounded-xl border border-ink-200 bg-white px-5 py-4 text-sm leading-relaxed text-ink-600">
        <p className="flex items-center gap-2 font-semibold text-ink-900">
          <Wallet className="size-4 text-brand-600" />
          Chave Pix do repasse
        </p>
        <p className="mt-1">
          Os repasses usam a chave cadastrada no seu credenciamento. Para trocar,
          fale com o suporte em <strong>autoricbr@gmail.com</strong>.
        </p>
        <p className="mt-3 flex items-center gap-2 font-semibold text-ink-900">
          <HandCoins className="size-4 text-brand-600" />
          Regras completas
        </p>
        <p className="mt-1">
          Base de cálculo, estornos e divulgação estão em{" "}
          <Link
            href="/afiliados"
            className="font-medium text-brand-700 underline decoration-brand-300 underline-offset-2"
          >
            Programa de afiliados
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
