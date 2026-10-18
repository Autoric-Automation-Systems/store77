import Link from "next/link";
import { Badge, Card, CardHeader, PageHeader, Stat } from "@/components/ui";
import { adminStoreRows, platformMetrics } from "@/lib/admin-metrics";
import { ACCESS_LABELS, ACCESS_TONES } from "@/lib/billing/access";
import { formatBRL, formatDate } from "@/lib/format";
import { requirePlatformAdmin } from "@/lib/platform";

export const dynamic = "force-dynamic";

export default async function AdminStoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; erro?: string }>;
}) {
  await requirePlatformAdmin();
  const { q = "" } = await searchParams;
  const term = q.trim().toLowerCase();

  const rows = await adminStoreRows();
  const metrics = await platformMetrics(rows);

  const visible = term
    ? rows.filter(
        (row) =>
          row.store.name.toLowerCase().includes(term) ||
          row.store.slug.toLowerCase().includes(term),
      )
    : rows;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lojas e cobrança"
        description="Receita, teste, cortesias e pendências de todas as lojas."
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
          label="Cortesias ativas"
          value={String(metrics.courtesy)}
          hint="Inclui vitalícias e parcerias"
          tone="info"
        />
        <Stat
          label="Faturas vencidas"
          value={String(metrics.overdueCount)}
          hint={formatBRL(metrics.overdueCents)}
          tone={metrics.overdueCount > 0 ? "danger" : "neutral"}
        />
      </div>

      <Card>
        <CardHeader
          title="Lojas"
          description={`${metrics.blocked} loja(s) suspensa(s) ou cancelada(s).`}
          action={
            <form className="flex items-center gap-2" action="/admin/lojas">
              <input
                className="input py-1.5"
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Nome ou slug"
              />
              <button className="btn btn-secondary px-3 py-1.5" type="submit">
                Buscar
              </button>
            </form>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-5 py-3 sm:px-6">Loja</th>
                <th className="px-3 py-3">Plano</th>
                <th className="px-3 py-3">Assentos</th>
                <th className="px-3 py-3">Estado</th>
                <th className="px-3 py-3">Vencimento</th>
                <th className="px-5 py-3 sm:px-6">Criada</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(({ store, subscription, access, plan, seats }) => (
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
                  <td className="px-3 py-3">
                    {plan?.name ?? "—"}
                    {subscription?.billingMode === "COMPLIMENTARY" ? (
                      <span className="ml-1 text-xs text-ink-500">cortesia</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    {seats}
                    {plan
                      ? ` / ${plan.includedSeats + (subscription?.extraSeats ?? 0)}`
                      : ""}
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone={ACCESS_TONES[access.state]}>
                      {ACCESS_LABELS[access.state]}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">{formatDate(access.periodEnd)}</td>
                  <td className="px-5 py-3 sm:px-6">
                    {formatDate(store.createdAt)}
                  </td>
                </tr>
              ))}
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-ink-500">
                    {term
                      ? `Nenhuma loja encontrada para "${q}".`
                      : "Nenhuma loja cadastrada ainda."}
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
