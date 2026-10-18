import Link from "next/link";
import { Alert, Badge, Card, CardHeader, PageHeader, Stat } from "@/components/ui";
import { adminStoreRows, platformMetrics } from "@/lib/admin-metrics";
import { adminAffiliateList } from "@/lib/affiliates";
import { payoutQueue } from "@/lib/affiliate-payouts";
import { ACCESS_LABELS, ACCESS_TONES } from "@/lib/billing/access";
import { PLANS } from "@/lib/billing/plans";
import { formatBRL, formatDate } from "@/lib/format";
import { requirePlatformAdmin } from "@/lib/platform";

export const dynamic = "force-dynamic";

/** Atalho com número: o painel responde "quanto tem" antes de "onde clico". */
function ShortcutCard({
  href,
  title,
  value,
  hint,
  tone = "neutral",
}: {
  href: string;
  title: string;
  value: string;
  hint: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const border = {
    neutral: "border-ink-200",
    success: "border-emerald-200",
    warning: "border-amber-200",
    danger: "border-red-200",
    info: "border-brand-200",
  }[tone];

  return (
    <Link
      href={href}
      className={`card card-pad group border ${border} transition hover:shadow-md`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-ink-800 group-hover:text-brand-700">
          {title}
        </p>
        <span aria-hidden className="text-ink-300 group-hover:text-brand-500">
          →
        </span>
      </div>
      <p className="mt-3 text-xl font-bold text-ink-900 sm:text-2xl">{value}</p>
      <p className="mt-1">
        <Badge tone={tone}>{hint}</Badge>
      </p>
    </Link>
  );
}

export default async function AdminPanelPage() {
  await requirePlatformAdmin();

  const rows = await adminStoreRows();
  const [metrics, affiliates, queue] = await Promise.all([
    platformMetrics(rows),
    adminAffiliateList(),
    payoutQueue(),
  ]);

  const activeAffiliates = affiliates.filter((item) => item.status === "ATIVO");
  const awaitingReview = affiliates.filter((item) => item.status === "PENDENTE");
  const payoutCents = queue.reduce((sum, item) => sum + item.availableCents, 0);

  const trialsExpiring = rows
    .filter((row) => row.access.state === "TRIALING" && row.access.periodEnd)
    .sort(
      (a, b) =>
        (a.access.periodEnd?.getTime() ?? 0) -
        (b.access.periodEnd?.getTime() ?? 0),
    )
    .slice(0, 5);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Painel"
        description="Visão da plataforma: cobrança, planos e programa de afiliados."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="MRR estimado"
          value={formatBRL(metrics.mrrCents)}
          hint="Assinaturas pagas, fora cortesias"
          tone="success"
        />
        <Stat
          label="Lojas"
          value={String(metrics.storeCount)}
          hint={`${metrics.trials} em teste`}
          tone="neutral"
        />
        <Stat
          label="Afiliados ativos"
          value={String(activeAffiliates.length)}
          hint={`${awaitingReview.length} aguardando análise`}
          tone={awaitingReview.length > 0 ? "warning" : "neutral"}
        />
        <Stat
          label="Repasses a enviar"
          value={formatBRL(payoutCents)}
          hint={
            queue.length > 0
              ? `${queue.length} afiliado(s) com saldo`
              : "Nenhum saldo liberado"
          }
          tone={queue.length > 0 ? "warning" : "neutral"}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ShortcutCard
          href="/admin/lojas"
          title="Lojas e cobrança"
          value={String(metrics.active)}
          hint={`${metrics.blocked} suspensa(s) ou cancelada(s)`}
          tone={metrics.blocked > 0 ? "warning" : "success"}
        />
        <ShortcutCard
          href="/admin/planos"
          title="Planos"
          value={formatBRL(PLANS[0].monthlyCents)}
          hint="Âncora Essencial · mensal"
          tone="info"
        />
        <ShortcutCard
          href="/admin/afiliados"
          title="Afiliados"
          value={String(affiliates.length)}
          hint={`${queue.length} repasse(s) na fila`}
          tone={queue.length > 0 ? "warning" : "neutral"}
        />
      </div>

      {metrics.overdueCount > 0 ? (
        <Alert tone="warning">
          {metrics.overdueCount} fatura(s) vencida(s), somando{" "}
          {formatBRL(metrics.overdueCents)}.{" "}
          <Link href="/admin/lojas" className="underline">
            Ver lojas
          </Link>
        </Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Testes terminando"
            description="Quem está em teste e quando o acesso aperta."
            action={
              <Link
                href="/admin/lojas"
                className="text-sm text-brand-700 underline"
              >
                Todas
              </Link>
            }
          />
          {trialsExpiring.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-500">
              Nenhuma loja em período de teste.
            </p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {trialsExpiring.map(({ store, access }) => (
                <li
                  key={store.id}
                  className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
                >
                  <Link
                    href={`/admin/lojas/${store.id}`}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {store.name}
                  </Link>
                  <span className="text-ink-500">
                    até {formatDate(access.periodEnd)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Repasses pendentes"
            description="Saldo liberado por afiliado, já descontada a retenção."
            action={
              <Link
                href="/admin/afiliados"
                className="text-sm text-brand-700 underline"
              >
                Gerenciar
              </Link>
            }
          />
          {queue.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-500">
              Nada a pagar: nenhuma comissão liberada no momento.
            </p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {queue.slice(0, 5).map((item) => (
                <li
                  key={item.affiliateId}
                  className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
                >
                  <Link
                    href={`/admin/afiliados/${item.affiliateId}`}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {item.name}
                  </Link>
                  <Badge tone={item.pixKey ? "success" : "warning"}>
                    {item.pixKey
                      ? formatBRL(item.availableCents)
                      : "sem chave Pix"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Últimas lojas"
          description="Cinco cadastros mais recentes, com plano e estado de acesso."
          action={
            <Link
              href="/admin/lojas"
              className="text-sm text-brand-700 underline"
            >
              Ver todas
            </Link>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-5 py-3 sm:px-6">Loja</th>
                <th className="px-3 py-3">Plano</th>
                <th className="px-3 py-3">Estado</th>
                <th className="px-5 py-3 sm:px-6">Criada</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 5).map(({ store, plan, access }) => (
                <tr key={store.id} className="border-b border-ink-100 last:border-0">
                  <td className="px-5 py-3 sm:px-6">
                    <Link
                      href={`/admin/lojas/${store.id}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {store.name}
                    </Link>
                    <p className="text-xs text-ink-500">/{store.slug}</p>
                  </td>
                  <td className="px-3 py-3">{plan?.name ?? "—"}</td>
                  <td className="px-3 py-3">
                    <Badge tone={ACCESS_TONES[access.state]}>
                      {ACCESS_LABELS[access.state]}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 sm:px-6">
                    {formatDate(store.createdAt)}
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-ink-500">
                    Nenhuma loja cadastrada ainda.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
