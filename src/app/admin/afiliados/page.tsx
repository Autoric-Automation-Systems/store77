import Link from "next/link";
import { purgeStaleAffiliatesAction } from "@/app/actions/admin-affiliates";
import { Alert, Badge, Card, CardHeader, PageHeader, Stat } from "@/components/ui";
import {
  adminAffiliateList,
  AFFILIATE_STATUS_LABELS,
  STALE_AFFILIATE_MONTHS,
  staleAffiliates,
} from "@/lib/affiliates";
import { formatBRL, formatDate } from "@/lib/format";
import { requirePlatformAdmin } from "@/lib/platform";

export const dynamic = "force-dynamic";

const STATUS_TONES = {
  PENDENTE: "warning",
  ATIVO: "success",
  SUSPENSO: "danger",
  RECUSADO: "neutral",
} as const;

export default async function AdminAffiliatesPage({
  searchParams,
}: {
  searchParams: Promise<{ removidos?: string; erro?: string }>;
}) {
  await requirePlatformAdmin();
  const { removidos, erro } = await searchParams;

  const [affiliates, stale] = await Promise.all([
    adminAffiliateList(),
    staleAffiliates(),
  ]);

  const active = affiliates.filter((item) => item.status === "ATIVO");
  const totalPaid = affiliates.reduce((sum, item) => sum + item.paidCents, 0);
  const totalAvailable = affiliates.reduce(
    (sum, item) => sum + item.availableCents,
    0,
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Afiliados"
        description="Cadastros, indicações e comissões do programa."
        action={
          <Link href="/admin" className="btn btn-secondary">
            Cobrança
          </Link>
        }
      />

      {removidos !== undefined ? (
        <Alert tone="success">
          {Number(removidos) === 0
            ? "Nenhum cadastro vencido para remover."
            : `${removidos} cadastro(s) sem indicação removido(s).`}
        </Alert>
      ) : null}
      {erro ? <Alert tone="danger">Não foi possível concluir a ação.</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Afiliados ativos"
          value={String(active.length)}
          hint={`${affiliates.length} no total`}
          tone="info"
        />
        <Stat
          label="Indicações"
          value={String(affiliates.reduce((sum, item) => sum + item.referralCount, 0))}
          hint={`${affiliates.reduce((sum, item) => sum + item.convertedCount, 0)} converteram`}
          tone="neutral"
        />
        <Stat
          label="Comissões a pagar"
          value={formatBRL(totalAvailable)}
          hint="Disponíveis para repasse"
          tone="warning"
        />
        <Stat
          label="Já repassado"
          value={formatBRL(totalPaid)}
          hint="Histórico pago"
          tone="success"
        />
      </div>

      <Card>
        <CardHeader
          title="Cadastros"
          description="Clique para ver lojas indicadas e extrato completo."
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-5 py-3 sm:px-6">Afiliado</th>
                <th className="px-3 py-3">Código</th>
                <th className="px-3 py-3">Situação</th>
                <th className="px-3 py-3">Lojas</th>
                <th className="px-3 py-3 text-right">Retenção</th>
                <th className="px-3 py-3 text-right">Disponível</th>
                <th className="px-3 py-3 text-right">Pago</th>
                <th className="px-5 py-3 sm:px-6">Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {affiliates.map((affiliate) => (
                <tr
                  key={affiliate.id}
                  className="border-b border-ink-100 last:border-0"
                >
                  <td className="px-5 py-3 sm:px-6">
                    <Link
                      href={`/admin/afiliados/${affiliate.id}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {affiliate.name}
                    </Link>
                    <p className="text-xs text-ink-500">{affiliate.email}</p>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-ink-700">
                    {affiliate.code}
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone={STATUS_TONES[affiliate.status]}>
                      {AFFILIATE_STATUS_LABELS[affiliate.status]}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">
                    {affiliate.referralCount}
                    {affiliate.convertedCount > 0 ? (
                      <span className="text-xs text-ink-500">
                        {" "}
                        ({affiliate.convertedCount} pagaram)
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-right text-ink-600">
                    {formatBRL(affiliate.pendingCents)}
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-ink-900">
                    {formatBRL(affiliate.availableCents)}
                  </td>
                  <td className="px-3 py-3 text-right text-ink-600">
                    {formatBRL(affiliate.paidCents)}
                  </td>
                  <td className="px-5 py-3 sm:px-6 text-ink-600">
                    {formatDate(affiliate.createdAt)}
                  </td>
                </tr>
              ))}
              {affiliates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-ink-500">
                    Nenhum afiliado cadastrado ainda.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Cadastros sem indicação"
          description={`Com mais de ${STALE_AFFILIATE_MONTHS} meses e nenhuma loja vinculada, são removidos.`}
          action={
            stale.length > 0 ? (
              <form action={purgeStaleAffiliatesAction}>
                <button type="submit" className="btn btn-secondary px-3 py-1.5">
                  Remover {stale.length}
                </button>
              </form>
            ) : null
          }
        />
        {stale.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink-500">
            Nenhum cadastro vencido. Nada a remover.
          </p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {stale.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"
              >
                <span className="font-medium text-ink-800">{item.name}</span>
                <span className="text-ink-500">{item.email}</span>
                <span className="text-ink-500">
                  desde {formatDate(item.createdAt)}
                </span>
                <Badge tone={STATUS_TONES[item.status]}>
                  {AFFILIATE_STATUS_LABELS[item.status]}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
