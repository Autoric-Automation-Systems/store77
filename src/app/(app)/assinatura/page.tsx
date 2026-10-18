import {
  cancelSubscriptionAction,
  selectPlanAction,
  updateAddonsAction,
} from "@/app/actions/billing";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Badge, Card, CardHeader, PageHeader, Stat } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { getStoreAccess } from "@/lib/billing/entitlements";
import { ACCESS_LABELS, ACCESS_TONES } from "@/lib/billing/access";
import {
  ADDONS,
  PUBLIC_PLANS,
  monthlyEquivalentCents,
  periodTotalCents,
} from "@/lib/billing/plans";
import { formatBRL, formatDate } from "@/lib/format";
import { canManageBilling } from "@/lib/roles";
import Link from "next/link";

export const metadata = { title: "Assinatura" };

const MESSAGES: Record<string, { tone: "success" | "info"; text: string }> = {
  plano: {
    tone: "success",
    text: "Plano alterado. O novo valor entra na próxima fatura, sem cobrança proporcional.",
  },
  adicionais: {
    tone: "success",
    text: "Adicionais atualizados. A próxima fatura já considera o novo valor.",
  },
  cancelada: {
    tone: "info",
    text: "Assinatura cancelada. Você mantém o acesso até o fim do período já pago.",
  },
  aguardando: {
    tone: "info",
    text: "Assinatura criada. Assim que o gateway gerar a primeira fatura, o link de pagamento aparece aqui.",
  },
};

const INVOICE_TONES = {
  PENDENTE: "warning",
  PAGA: "success",
  VENCIDA: "danger",
  CANCELADA: "neutral",
  ESTORNADA: "neutral",
} as const;

export default async function AssinaturaPage({
  searchParams,
}: {
  searchParams: Promise<{
    ok?: string;
    erro?: string;
    semPermissao?: string;
    bloqueio?: string;
  }>;
}) {
  const user = await requireAdmin();
  const { ok = "", erro = "", semPermissao, bloqueio } = await searchParams;
  const overview = await getStoreAccess(user.storeId);
  const { access, plan, limits, subscription, seatsUsed, salesThisMonth } =
    overview;
  const message = MESSAGES[ok];
  const isOwner = canManageBilling(user.role);
  const lifetime = access.isLifetime;
  const addons = {
    extraSeats: subscription?.extraSeats ?? 0,
    extraStores: subscription?.extraStores ?? 0,
    extraSalesPacks: subscription?.extraSalesPacks ?? 0,
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Assinatura"
        description="Plano, uso e faturas da loja. A cobrança é da plataforma, separada do financeiro da loja."
        action={
          <Link href="/ajuda/planos" className="btn btn-secondary">
            Como funciona
          </Link>
        }
      />

      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
      {erro ? <Alert tone="danger">{erro}</Alert> : null}
      {bloqueio ? (
        <Alert tone="warning">
          A assinatura está pendente e essa ação é de gestão, por isso foi
          bloqueada. O PDV, o caixa e a vitrine continuam funcionando. Veja{" "}
          <Link href="/ajuda/planos#atraso" className="underline">
            o que fica bloqueado em cada prazo
          </Link>
          .
        </Alert>
      ) : null}
      {semPermissao ? (
        <Alert tone="warning">
          Apenas o proprietário contrata, troca de plano ou cancela a
          assinatura. Você pode consultar os dados abaixo.
        </Alert>
      ) : null}
      {!canManageBilling(user.role) ? (
        <Alert tone="info">
          Você é gerente e pode acompanhar a assinatura, mas as mudanças ficam
          com o proprietário da loja.
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Estado"
          value={ACCESS_LABELS[access.state]}
          hint={lifetime ? "Cortesia vitalícia" : plan.name}
          tone={ACCESS_TONES[access.state]}
        />
        <Stat
          label="Usuários ativos"
          value={`${seatsUsed} de ${limits.seats}`}
          hint={
            seatsUsed >= limits.seats ? "Limite atingido" : "Assentos do plano"
          }
          tone={seatsUsed >= limits.seats ? "warning" : "neutral"}
        />
        <Stat
          label="Vendas no mês"
          value={salesThisMonth.toLocaleString("pt-BR")}
          hint={`Inclui ${limits.salesPerMonth.toLocaleString("pt-BR")} no plano`}
          tone={salesThisMonth > limits.salesPerMonth ? "warning" : "neutral"}
        />
        <Stat
          label={lifetime ? "Renovação" : "Próximo vencimento"}
          value={lifetime ? "—" : formatDate(access.periodEnd)}
          hint={lifetime ? "Sem cobrança" : subscription?.interval === "YEARLY" ? "Anual" : "Mensal"}
          tone="neutral"
        />
      </div>

      {access.state !== "ACTIVE" && access.state !== "TRIALING" ? (
        <Alert tone={access.state === "PAST_DUE" ? "warning" : "danger"}>
          {access.reason}
          {access.capabilities.exportData ? (
            <>
              {" "}
              Seus dados continuam disponíveis e podem ser exportados sob
              solicitação.{" "}
              <Link className="underline" href="/ajuda/planos#atraso">
                Entenda os prazos
              </Link>
              .
            </>
          ) : null}
        </Alert>
      ) : null}

      {subscription?.billingMode === "COMPLIMENTARY" ? (
        <Card>
          <CardHeader
            title={lifetime ? "Cortesia vitalícia" : "Cortesia com prazo"}
            description="Esta loja não é cobrada. A cortesia é concedida pelo time do Store77 e aparece no histórico da assinatura."
          />
          <dl className="grid gap-4 px-5 py-4 text-sm sm:grid-cols-2 sm:px-6">
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-500">
                Motivo
              </dt>
              <dd className="mt-1 text-ink-800">
                {subscription.grantReason ?? "Não informado"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-500">
                Validade
              </dt>
              <dd className="mt-1 text-ink-800">
                {lifetime
                  ? "Enquanto o produto existir, sem renovação"
                  : formatDate(subscription.grantExpiresAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-500">
                Plano aplicado
              </dt>
              <dd className="mt-1 text-ink-800">
                {plan.name} · {limits.seats} usuários ·{" "}
                {limits.salesPerMonth.toLocaleString("pt-BR")} vendas/mês
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-500">
                Indicadores
              </dt>
              <dd className="mt-1 text-ink-800">
                {subscription.excludeFromMetrics
                  ? "Fora do MRR e das comissões de afiliado"
                  : "Conta como cortesia concedida"}
              </dd>
            </div>
          </dl>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Planos"
          description="O Essencial é a base. Cada plano acima mantém a mesma proporção de preço e amplia assentos, lojas e vendas."
          action={
            <Link href="/ajuda/planos" className="text-sm font-medium text-brand-700 underline">
              Comparar planos
            </Link>
          }
        />
        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-5">
          {PUBLIC_PLANS.map((item) => {
            const current = item.code === plan.code;
            const total = periodTotalCents(item, addons, "MONTHLY");
            const annualTotal = periodTotalCents(item, addons, "YEARLY");
            return (
              <div
                key={item.code}
                className={`flex flex-col rounded-xl border p-4 ${
                  current
                    ? "border-brand-300 bg-brand-50/50"
                    : "border-ink-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-ink-900">{item.name}</p>
                  {current ? <Badge tone="info">Atual</Badge> : null}
                </div>
                <p className="mt-1 text-xs text-ink-500">{item.tagline}</p>
                <p className="mt-3 text-lg font-bold text-ink-900">
                  {formatBRL(total)}
                  <span className="text-xs font-normal text-ink-500">/mês</span>
                </p>
                <p className="text-xs text-ink-500">
                  ou {formatBRL(annualTotal)}/ano
                </p>
                <ul className="mt-3 flex-1 space-y-1 text-xs text-ink-600">
                  {item.features.slice(-3).map((feature) => (
                    <li key={feature}>· {feature}</li>
                  ))}
                </ul>
                {isOwner ? (
                  <div className="mt-4 space-y-2">
                    <form action={selectPlanAction}>
                      <input type="hidden" name="planCode" value={item.code} />
                      <input type="hidden" name="interval" value="MONTHLY" />
                      <SubmitButton
                        className={`btn w-full ${current ? "btn-secondary" : "btn-primary"}`}
                        pendingLabel="Abrindo..."
                      >
                        {current ? "Manter mensal" : "Escolher mensal"}
                      </SubmitButton>
                    </form>
                    <form action={selectPlanAction}>
                      <input type="hidden" name="planCode" value={item.code} />
                      <input type="hidden" name="interval" value="YEARLY" />
                      <SubmitButton
                        className="btn btn-secondary w-full"
                        pendingLabel="Abrindo..."
                      >
                        Anual · {formatBRL(monthlyEquivalentCents(item, addons, "YEARLY"))}/mês
                      </SubmitButton>
                    </form>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        <p className="border-t border-ink-200 px-5 py-3 text-xs text-ink-500 sm:px-6">
          Mudança de plano vale no próximo ciclo, sem cobrança proporcional. No
          anual, o desconto de 20% já está aplicado.
        </p>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Adicionais"
            description="Some capacidade sem trocar de plano."
          />
          <form action={updateAddonsAction} className="space-y-4 px-5 py-4 sm:px-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-sm">
                <span className="label">Usuários extra</span>
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={200}
                  name="extraSeats"
                  defaultValue={addons.extraSeats}
                  disabled={!isOwner}
                />
                <span className="mt-1 block text-xs text-ink-500">
                  {formatBRL(ADDONS.seat.monthlyCents)} cada
                </span>
              </label>
              <label className="text-sm">
                <span className="label">Lojas extra</span>
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={200}
                  name="extraStores"
                  defaultValue={addons.extraStores}
                  disabled={!isOwner}
                />
                <span className="mt-1 block text-xs text-ink-500">
                  {formatBRL(ADDONS.store.monthlyCents)} cada
                </span>
              </label>
              <label className="text-sm">
                <span className="label">Pacotes de venda</span>
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={200}
                  name="extraSalesPacks"
                  defaultValue={addons.extraSalesPacks}
                  disabled={!isOwner}
                />
                <span className="mt-1 block text-xs text-ink-500">
                  +{ADDONS.salesPack.sales.toLocaleString("pt-BR")} vendas por{" "}
                  {formatBRL(ADDONS.salesPack.monthlyCents)}
                </span>
              </label>
            </div>
            {isOwner ? (
              <SubmitButton className="btn btn-secondary">
                Atualizar adicionais
              </SubmitButton>
            ) : null}
          </form>
        </Card>

        <Card>
          <CardHeader
            title="Faturas"
            description="As faturas são emitidas pelo gateway. O comprovante fica no link de cada linha."
          />
          {overview.invoices.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-500 sm:px-6">
              Nenhuma fatura emitida ainda.
              {access.state === "TRIALING"
                ? " Durante o teste não há cobrança."
                : ""}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-5 py-3 sm:px-6">Vencimento</th>
                    <th className="px-3 py-3">Valor</th>
                    <th className="px-3 py-3">Situação</th>
                    <th className="px-5 py-3 sm:px-6">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-ink-100 last:border-0">
                      <td className="px-5 py-3 sm:px-6">{formatDate(invoice.dueDate)}</td>
                      <td className="px-3 py-3">{formatBRL(invoice.amountCents)}</td>
                      <td className="px-3 py-3">
                        <Badge tone={INVOICE_TONES[invoice.status]}>
                          {invoice.status.toLowerCase()}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 sm:px-6">
                        {invoice.invoiceUrl ? (
                          <a
                            href={invoice.invoiceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-brand-700 underline"
                          >
                            Abrir
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {isOwner && subscription?.billingMode !== "COMPLIMENTARY" ? (
        <Card>
          <CardHeader
            title="Cancelar assinatura"
            description="O acesso continua até o fim do período já pago. Depois disso a loja fica somente leitura e a vitrine sai do ar."
          />
          <details className="px-5 py-4 sm:px-6">
            <summary className="cursor-pointer text-sm font-medium text-red-700">
              Quero cancelar
            </summary>
            <form action={cancelSubscriptionAction} className="mt-3">
              <SubmitButton className="btn btn-danger" pendingLabel="Cancelando...">
                Confirmar cancelamento
              </SubmitButton>
            </form>
          </details>
        </Card>
      ) : null}
    </div>
  );
}
