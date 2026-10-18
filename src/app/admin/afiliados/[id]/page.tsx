import Link from "next/link";
import { notFound } from "next/navigation";
import {
  regenerateAffiliateCodeAction,
  setAffiliateStatusAction,
} from "@/app/actions/admin-affiliates";
import { CopyField } from "@/components/copy-field";
import { Alert, Badge, Card, CardHeader, PageHeader, Stat } from "@/components/ui";
import {
  adminAffiliateDetail,
  AFFILIATE_STATUS_LABELS,
  COMMISSION_STAGE_LABELS,
  isShortAffiliateCode,
  referralLink,
} from "@/lib/affiliates";
import { formatDocument } from "@/lib/document";
import {
  COMMISSION_HOLD_DAYS,
  DEFAULT_COMMISSION_MONTHS,
} from "@/lib/billing/plans";
import { formatBRL, formatDate, formatDateTime } from "@/lib/format";
import { requirePlatformAdmin } from "@/lib/platform";

export const dynamic = "force-dynamic";

const STAGE_TONES = {
  PENDENTE: "warning",
  DISPONIVEL: "success",
  PAGO: "info",
  ESTORNADO: "danger",
} as const;

const STATUS_TONES = {
  PENDENTE: "warning",
  ATIVO: "success",
  SUSPENSO: "danger",
  RECUSADO: "neutral",
} as const;

const ACCESS_LABELS: Record<string, string> = {
  TRIALING: "Em teste",
  ACTIVE: "Ativa",
  GRACE: "Atrasada",
  RESTRICTED: "Gestão bloqueada",
  SUSPENDED: "Suspensa",
  CANCELED: "Cancelada",
};

export default async function AdminAffiliatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  await requirePlatformAdmin();
  const { id } = await params;
  const { ok, erro } = await searchParams;

  const detail = await adminAffiliateDetail(id);
  if (!detail) notFound();

  const { affiliate, referrals, commissions, payouts, totals } = detail;

  return (
    <div className="space-y-5">
      <PageHeader
        title={affiliate.name}
        description={`${affiliate.email} · ${AFFILIATE_STATUS_LABELS[affiliate.status]}`}
        action={
          <Link href="/admin/afiliados" className="btn btn-secondary">
            Voltar
          </Link>
        }
      />

      {ok === "status" ? (
        <Alert tone="success">Situação do afiliado atualizada.</Alert>
      ) : null}
      {ok === "codigo" ? (
        <Alert tone="success">
          Novo código gerado. O link antigo não vale mais.
        </Alert>
      ) : null}
      {erro ? (
        <Alert tone="danger">Não foi possível atualizar a situação.</Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Lojas indicadas"
          value={String(referrals.length)}
          hint={`${referrals.filter((item) => item.convertedAt).length} converteram`}
          tone="info"
        />
        <Stat
          label="Disponível"
          value={formatBRL(totals.DISPONIVEL)}
          hint="Para repasse"
          tone="success"
        />
        <Stat
          label="Em retenção"
          value={formatBRL(totals.PENDENTE)}
          hint={`${COMMISSION_HOLD_DAYS} dias`}
          tone="warning"
        />
        <Stat
          label="Pago"
          value={formatBRL(totals.PAGO)}
          hint={totals.ESTORNADO > 0 ? `${formatBRL(totals.ESTORNADO)} estornado` : "Sem estornos"}
          tone="neutral"
        />
      </div>

      <Card className="card-pad">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              Dados do cadastro
            </p>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Documento</dt>
                <dd className="text-ink-800">
                  {affiliate.document ? formatDocument(affiliate.document) : "-"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Chave Pix</dt>
                <dd className="break-all text-ink-800">{affiliate.pixKey ?? "-"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Comissão</dt>
                <dd className="text-ink-800">
                  {(affiliate.commissionRateBp / 100).toFixed(2).replace(".", ",")}% por{" "}
                  {affiliate.commissionMonths} meses
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Cadastro</dt>
                <dd className="text-ink-800">{formatDateTime(affiliate.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Último acesso</dt>
                <dd className="text-ink-800">
                  {affiliate.lastLoginAt
                    ? formatDateTime(affiliate.lastLoginAt)
                    : "Nunca"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Termos aceitos</dt>
                <dd className="text-ink-800">
                  {affiliate.termsAcceptedAt
                    ? formatDate(affiliate.termsAcceptedAt)
                    : "Não registrado"}
                </dd>
              </div>
            </dl>
            {affiliate.notes ? (
              <p className="mt-3 rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-600">
                {affiliate.notes}
              </p>
            ) : null}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              Link de indicação
            </p>
            <div className="mt-2">
              <CopyField
                value={referralLink(affiliate.code)}
                label="Link do afiliado"
              />
            </div>
            {isShortAffiliateCode(affiliate.code) ? null : (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs text-amber-800">
                  Código antigo, derivado do nome. Gerar um novo código curto
                  quebra o link já divulgado.
                </p>
                <form action={regenerateAffiliateCodeAction} className="mt-2">
                  <input type="hidden" name="affiliateId" value={affiliate.id} />
                  <button
                    type="submit"
                    className="btn btn-secondary px-3 py-1.5 text-xs"
                  >
                    Gerar código curto
                  </button>
                </form>
              </div>
            )}
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-500">
              Situação
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone={STATUS_TONES[affiliate.status]}>
                {AFFILIATE_STATUS_LABELS[affiliate.status]}
              </Badge>
              {(["ATIVO", "SUSPENSO", "RECUSADO"] as const)
                .filter((status) => status !== affiliate.status)
                .map((status) => (
                  <form key={status} action={setAffiliateStatusAction}>
                    <input type="hidden" name="affiliateId" value={affiliate.id} />
                    <input type="hidden" name="status" value={status} />
                    <button
                      type="submit"
                      className="btn btn-secondary px-3 py-1.5 text-xs"
                    >
                      {status === "ATIVO"
                        ? "Reativar"
                        : status === "SUSPENSO"
                          ? "Suspender"
                          : "Recusar"}
                    </button>
                  </form>
                ))}
            </div>
            <p className="mt-2 text-xs text-ink-500">
              Suspenso e recusado perdem o acesso à área e deixam de gerar
              comissão. As lojas já indicadas continuam vinculadas.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Lojas indicadas"
          description={`Comissão de até ${DEFAULT_COMMISSION_MONTHS} faturas por loja.`}
        />
        {referrals.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink-500">
            Nenhuma loja indicada até agora.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-5 py-3 sm:px-6">Loja</th>
                  <th className="px-3 py-3">Plano</th>
                  <th className="px-3 py-3">Situação</th>
                  <th className="px-3 py-3">Indicada</th>
                  <th className="px-3 py-3">1º pagamento</th>
                  <th className="px-5 py-3 sm:px-6" />
                </tr>
              </thead>
              <tbody>
                {referrals.map((referral) => (
                  <tr
                    key={referral.storeId}
                    className="border-b border-ink-100 last:border-0"
                  >
                    <td className="px-5 py-3 sm:px-6 font-medium text-ink-800">
                      {referral.storeName}
                      <p className="text-xs text-ink-500">/{referral.storeSlug}</p>
                    </td>
                    <td className="px-3 py-3 text-ink-700">
                      {referral.planCode ?? "-"}
                    </td>
                    <td className="px-3 py-3">
                      {referral.accessState ? (
                        <Badge
                          tone={
                            referral.accessState === "ACTIVE"
                              ? "success"
                              : "neutral"
                          }
                        >
                          {ACCESS_LABELS[referral.accessState] ??
                            referral.accessState}
                        </Badge>
                      ) : (
                        <span className="text-ink-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-ink-600">
                      {formatDate(referral.attributedAt)}
                    </td>
                    <td className="px-3 py-3 text-ink-600">
                      {referral.convertedAt
                        ? formatDate(referral.convertedAt)
                        : "Ainda não"}
                    </td>
                    <td className="px-5 py-3 sm:px-6 text-right">
                      <Link
                        href={`/admin/lojas/${referral.storeId}`}
                        className="text-brand-700 hover:underline"
                      >
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Extrato de comissões" />
        {commissions.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink-500">
            Nenhuma comissão gerada. Só fatura paga gera comissão.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-5 py-3 sm:px-6">Data</th>
                  <th className="px-3 py-3">Loja</th>
                  <th className="px-3 py-3 text-right">Fatura</th>
                  <th className="px-3 py-3 text-right">%</th>
                  <th className="px-3 py-3 text-right">Comissão</th>
                  <th className="px-3 py-3">Situação</th>
                  <th className="px-5 py-3 sm:px-6">Liberação</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((commission) => (
                  <tr
                    key={commission.id}
                    className="border-b border-ink-100 last:border-0"
                  >
                    <td className="px-5 py-3 sm:px-6 text-ink-600">
                      {formatDate(commission.createdAt)}
                    </td>
                    <td className="px-3 py-3 text-ink-800">
                      {commission.storeName}
                    </td>
                    <td className="px-3 py-3 text-right text-ink-700">
                      {formatBRL(commission.baseAmountCents)}
                    </td>
                    <td className="px-3 py-3 text-right text-ink-600">
                      {(commission.rateBp / 100).toFixed(2).replace(".", ",")}%
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-ink-900">
                      {formatBRL(commission.amountCents)}
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={STAGE_TONES[commission.stage]}>
                        {COMMISSION_STAGE_LABELS[commission.stage]}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 sm:px-6 text-ink-600">
                      {commission.availableAt
                        ? formatDate(commission.availableAt)
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Repasses" />
        {payouts.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink-500">
            Nenhum repasse registrado.
          </p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {payouts.map((payout) => (
              <li
                key={payout.id}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"
              >
                <span className="text-ink-800">
                  {formatDate(payout.periodStart)} a {formatDate(payout.periodEnd)}
                </span>
                <span className="text-ink-600">{formatBRL(payout.amountCents)}</span>
                <Badge tone={payout.status === "PAGO" ? "success" : "warning"}>
                  {payout.status === "PAGO" ? "Pago" : "Pendente"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
