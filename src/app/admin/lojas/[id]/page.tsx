import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import {
  invoices,
  stores,
  subscriptionEvents,
  subscriptions,
  users,
} from "@/db/schema";
import {
  grantAction,
  revokeAction,
  setPlanAction,
  toggleMetricsAction,
} from "@/app/actions/platform-admin";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Badge, Card, CardHeader, PageHeader, Stat } from "@/components/ui";
import {
  accessFromSubscription,
  countActiveSeats,
} from "@/lib/billing/entitlements";
import { ACCESS_LABELS, ACCESS_TONES } from "@/lib/billing/access";
import {
  addonsOf,
  PLANS,
  findPlan,
  limitsFor,
  monthlyEquivalentCents,
} from "@/lib/billing/plans";
import { formatBRL, formatDate, formatDateTime } from "@/lib/format";
import { requirePlatformAdmin } from "@/lib/platform";

export const dynamic = "force-dynamic";

export default async function AdminStorePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  await requirePlatformAdmin();
  const { id } = await params;
  const { ok = "", erro = "" } = await searchParams;

  const [store] = await db()
    .select()
    .from(stores)
    .where(eq(stores.id, id))
    .limit(1);
  if (!store) notFound();

  const [subscription] = await db()
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.storeId, id))
    .limit(1);

  const [invoiceRows, eventRows, seats] = await Promise.all([
    db()
      .select()
      .from(invoices)
      .where(eq(invoices.storeId, id))
      .orderBy(desc(invoices.dueDate))
      .limit(20),
    subscription
      ? db()
          .select({
            id: subscriptionEvents.id,
            type: subscriptionEvents.type,
            fromStatus: subscriptionEvents.fromStatus,
            toStatus: subscriptionEvents.toStatus,
            detail: subscriptionEvents.detail,
            createdAt: subscriptionEvents.createdAt,
            actor: users.name,
          })
          .from(subscriptionEvents)
          .leftJoin(users, eq(users.id, subscriptionEvents.actorUserId))
          .where(eq(subscriptionEvents.subscriptionId, subscription.id))
          .orderBy(desc(subscriptionEvents.createdAt))
          .limit(25)
      : Promise.resolve([]),
    countActiveSeats(id),
  ]);

  const plan = subscription ? findPlan(subscription.planCode) : null;
  const access = subscription
    ? accessFromSubscription(subscription)
    : null;
  const limits = plan
    ? limitsFor(plan, addonsOf(subscription!))
    : { seats: 0, salesPerMonth: 0, stores: 0 };

  return (
    <div className="space-y-5">
      <PageHeader
        title={store.name}
        description={`/${store.slug} · criada em ${formatDate(store.createdAt)}`}
        action={
          <Link href="/admin/lojas" className="btn btn-secondary">
            Voltar
          </Link>
        }
      />

      {ok === "cortesia" ? (
        <Alert tone="success">Cortesia aplicada e registrada no histórico.</Alert>
      ) : null}
      {ok === "revogada" ? (
        <Alert tone="info">Cortesia revogada. A loja ficou somente leitura.</Alert>
      ) : null}
      {ok === "plano" ? <Alert tone="success">Plano alterado.</Alert> : null}
      {ok === "indicadores" ? (
        <Alert tone="info">Indicadores atualizados.</Alert>
      ) : null}
      {erro ? <Alert tone="danger">{erro}</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Estado"
          value={access ? ACCESS_LABELS[access.state] : "Sem assinatura"}
          hint={plan?.name ?? "—"}
          tone={access ? ACCESS_TONES[access.state] : "neutral"}
        />
        <Stat
          label="Mensalidade"
          value={
            plan && subscription
              ? formatBRL(
                  monthlyEquivalentCents(
                    plan,
                    addonsOf(subscription),
                    subscription.interval,
                  ),
                )
              : "—"
          }
          hint={
            subscription?.billingMode === "COMPLIMENTARY"
              ? "Cortesia, sem cobrança"
              : subscription?.interval === "YEARLY"
                ? "Cobrança anual"
                : "Cobrança mensal"
          }
          tone="neutral"
        />
        <Stat
          label="Assentos"
          value={`${seats} de ${limits.seats}`}
          hint="Somente papéis que operam a loja"
          tone={seats >= limits.seats ? "warning" : "neutral"}
        />
        <Stat
          label="Indicadores"
          value={subscription?.excludeFromMetrics ? "Fora" : "Dentro"}
          hint="MRR, churn e comissões"
          tone={subscription?.excludeFromMetrics ? "neutral" : "info"}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Dados da loja" />
          <dl className="grid gap-3 px-5 py-4 text-sm sm:px-6">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-500">Responsável</dt>
              <dd>{store.legalName ?? store.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-500">E-mail</dt>
              <dd>{store.email ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-500">Telefone</dt>
              <dd>{store.phone ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-500">Documento</dt>
              <dd>{store.document ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-500">Nome legal</dt>
              <dd>{store.legalName ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-500">Assinatura desde</dt>
              <dd>{formatDate(subscription?.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-500">Período atual</dt>
              <dd>
                {formatDate(subscription?.currentPeriodStart)} →{" "}
                {formatDate(subscription?.currentPeriodEnd)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-500">Gateway</dt>
              <dd className="text-right text-xs">
                {subscription?.providerSubscriptionId ?? "sem assinatura no gateway"}
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader
            title="Cortesia"
            description="Conceder, renovar ou revogar acesso sem cobrança."
          />
          <form action={grantAction} className="space-y-3 px-5 py-4 sm:px-6">
            <input type="hidden" name="storeId" value={store.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="label">Plano aplicado</span>
                <select
                  className="input"
                  name="planCode"
                  defaultValue={subscription?.planCode ?? "CORTESIA"}
                >
                  {PLANS.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name} · {item.includedSeats} usuários
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="label">Validade</span>
                <select className="input" name="mode" defaultValue="lifetime">
                  <option value="lifetime">Vitalícia (sem data de fim)</option>
                  <option value="months">Temporária</option>
                </select>
              </label>
            </div>
            <label className="block text-sm">
              <span className="label">Meses (se temporária)</span>
              <input
                className="input"
                type="number"
                name="months"
                min={1}
                max={120}
                defaultValue={12}
              />
            </label>
            <label className="block text-sm">
              <span className="label">Motivo (obrigatório)</span>
              <input
                className="input"
                name="reason"
                placeholder="Ex.: presente para loja parceira"
                required
                minLength={3}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                name="excludeFromMetrics"
                defaultChecked={subscription?.excludeFromMetrics ?? false}
              />
              Fora do MRR, churn e comissões (uso interno/teste)
            </label>
            <SubmitButton className="btn btn-primary">
              Conceder cortesia
            </SubmitButton>
          </form>

          {subscription?.billingMode === "COMPLIMENTARY" ? (
            <form
              action={revokeAction}
              className="space-y-3 border-t border-ink-200 px-5 py-4 sm:px-6"
            >
              <input type="hidden" name="storeId" value={store.id} />
              <label className="block text-sm">
                <span className="label">Motivo da revogação</span>
                <input className="input" name="reason" required minLength={3} />
              </label>
              <SubmitButton className="btn btn-danger" pendingLabel="Revogando...">
                Revogar cortesia
              </SubmitButton>
            </form>
          ) : null}
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Ajustes de suporte"
          description="Troca de plano não gera cobrança e não altera o gateway."
        />
        <div className="flex flex-wrap items-end gap-3 px-5 py-4 sm:px-6">
          <form action={setPlanAction} className="flex items-end gap-2">
            <input type="hidden" name="storeId" value={store.id} />
            <label className="text-sm">
              <span className="label">Plano</span>
              <select className="input" name="planCode" defaultValue={plan?.code}>
                {PLANS.filter((item) => item.isPublic).map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <SubmitButton className="btn btn-secondary">Aplicar plano</SubmitButton>
          </form>

          <form action={toggleMetricsAction}>
            <input type="hidden" name="storeId" value={store.id} />
            <SubmitButton className="btn btn-secondary">
              {subscription?.excludeFromMetrics
                ? "Incluir nos indicadores"
                : "Excluir dos indicadores"}
            </SubmitButton>
          </form>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Faturas" description="Últimas 20." />
          {invoiceRows.length === 0 ? (
            <p className="px-5 py-5 text-sm text-ink-500 sm:px-6">
              Nenhuma fatura.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-5 py-2 sm:px-6">Vencimento</th>
                    <th className="px-3 py-2">Valor</th>
                    <th className="px-3 py-2">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceRows.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-ink-100 last:border-0">
                      <td className="px-5 py-2 sm:px-6">{formatDate(invoice.dueDate)}</td>
                      <td className="px-3 py-2">{formatBRL(invoice.amountCents)}</td>
                      <td className="px-3 py-2">
                        <Badge
                          tone={
                            invoice.status === "PAGA"
                              ? "success"
                              : invoice.status === "VENCIDA"
                                ? "danger"
                                : "neutral"
                          }
                        >
                          {invoice.status.toLowerCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Histórico da assinatura" description="Últimos 25 eventos." />
          {eventRows.length === 0 ? (
            <p className="px-5 py-5 text-sm text-ink-500 sm:px-6">
              Sem eventos.
            </p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {eventRows.map((event) => (
                <li key={event.id} className="px-5 py-3 text-sm sm:px-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-ink-800">{event.type}</span>
                    <span className="text-xs text-ink-500">
                      {formatDateTime(event.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-ink-500">
                    {event.actor ? `por ${event.actor}` : "sistema"}
                    {event.fromStatus ? ` · ${event.fromStatus}` : ""}
                    {event.toStatus ? ` → ${event.toStatus}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
