import { and, asc, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import { Search } from "lucide-react";
import { db } from "@/db";
import { financialEntries, sales } from "@/db/schema";
import { isAdminRole, requireAdmin } from "@/lib/auth";
import { formatBRL, formatDate, todayISO } from "@/lib/format";
import {
  Alert,
  Badge,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Stat,
} from "@/components/ui";
import { EntryActions } from "./entry-actions";
import { EntryForm } from "./entry-form";

export const metadata = { title: "Financeiro" };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS_LABELS = {
  PENDENTE: "Pendente",
  PAGO: "Pago",
  CANCELADO: "Cancelado",
} as const;

const STATUS_TONES = {
  PENDENTE: "neutral",
  PAGO: "success",
  CANCELADO: "neutral",
} as const;

type Search = {
  kind?: string;
  status?: string;
  de?: string;
  ate?: string;
  edit?: string;
};

function firstDayOfMonthISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function normalizeStatus(value: string | undefined) {
  if (value === "PAGO" || value === "CANCELADO" || value === "todos") {
    return value;
  }
  return "pendentes";
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  // Financeiro é restrito à gestão (proprietário/gerente).
  const user = await requireAdmin();
  const params = await searchParams;

  const kind = params.kind === "RECEBER" || params.kind === "PAGAR" ? params.kind : "";
  const status = normalizeStatus(params.status);
  const from = DATE_PATTERN.test(params.de ?? "") ? (params.de as string) : firstDayOfMonthISO();
  const to = DATE_PATTERN.test(params.ate ?? "") ? (params.ate as string) : todayISO();
  const editId = UUID_PATTERN.test(params.edit ?? "") ? (params.edit as string) : null;

  const isAdmin = isAdminRole(user.role);
  const today = todayISO();

  const filters: SQL[] = [
    eq(financialEntries.storeId, user.storeId),
    gte(financialEntries.dueDate, from),
    lte(financialEntries.dueDate, to),
  ];
  if (kind) filters.push(eq(financialEntries.kind, kind));
  if (status === "PAGO") filters.push(eq(financialEntries.status, "PAGO"));
  else if (status === "CANCELADO") filters.push(eq(financialEntries.status, "CANCELADO"));
  else if (status === "pendentes") filters.push(eq(financialEntries.status, "PENDENTE"));

  const [entries, pendingSummary, receivedSummary, salesSummary] = await Promise.all([
    db()
      .select({
        id: financialEntries.id,
        kind: financialEntries.kind,
        status: financialEntries.status,
        description: financialEntries.description,
        category: financialEntries.category,
        amountCents: financialEntries.amountCents,
        dueDate: financialEntries.dueDate,
        notes: financialEntries.notes,
      })
      .from(financialEntries)
      .where(and(...filters))
      .orderBy(asc(financialEntries.dueDate), asc(financialEntries.createdAt))
      .limit(200),

    db()
      .select({
        toReceive: sql<number>`coalesce(sum(${financialEntries.amountCents}) filter (where ${financialEntries.kind} = 'RECEBER'), 0)::int`,
        toPay: sql<number>`coalesce(sum(${financialEntries.amountCents}) filter (where ${financialEntries.kind} = 'PAGAR'), 0)::int`,
      })
      .from(financialEntries)
      .where(
        and(
          eq(financialEntries.storeId, user.storeId),
          eq(financialEntries.status, "PENDENTE"),
          gte(financialEntries.dueDate, from),
          lte(financialEntries.dueDate, to),
        ),
      ),

    db()
      .select({
        total: sql<number>`coalesce(sum(${financialEntries.amountCents}), 0)::int`,
      })
      .from(financialEntries)
      .where(
        and(
          eq(financialEntries.storeId, user.storeId),
          eq(financialEntries.kind, "RECEBER"),
          eq(financialEntries.status, "PAGO"),
          sql`${financialEntries.paidAt}::date between ${from}::date and ${to}::date`,
        ),
      ),

    db()
      .select({
        count: sql<number>`count(*)::int`,
        total: sql<number>`coalesce(sum(${sales.totalCents}), 0)::int`,
      })
      .from(sales)
      .where(
        and(
          eq(sales.storeId, user.storeId),
          eq(sales.status, "PAGA"),
          sql`${sales.createdAt}::date between ${from}::date and ${to}::date`,
        ),
      ),
  ]);

  const editingEntry = editId
    ? ((
        await db()
          .select({
            id: financialEntries.id,
            kind: financialEntries.kind,
            description: financialEntries.description,
            category: financialEntries.category,
            amountCents: financialEntries.amountCents,
            dueDate: financialEntries.dueDate,
            paymentMethod: financialEntries.paymentMethod,
            notes: financialEntries.notes,
          })
          .from(financialEntries)
          .where(
            and(
              eq(financialEntries.id, editId),
              eq(financialEntries.storeId, user.storeId),
            ),
          )
          .limit(1)
      )[0] ?? null)
    : null;

  const toReceive = pendingSummary[0]?.toReceive ?? 0;
  const toPay = pendingSummary[0]?.toPay ?? 0;
  const receivedEntries = receivedSummary[0]?.total ?? 0;
  const salesCount = salesSummary[0]?.count ?? 0;
  const salesRevenue = salesSummary[0]?.total ?? 0;
  const receivedTotal = receivedEntries + salesRevenue;
  const forecast = toReceive + salesRevenue - toPay;

  /** Mantém o filtro atual nos links de edição e de cancelamento. */
  function financeHref(edit?: string) {
    const search = new URLSearchParams({ status, de: from, ate: to });
    if (kind) search.set("kind", kind);
    if (edit) search.set("edit", edit);
    return `/financeiro?${search.toString()}`;
  }

  return (
    <>
      <PageHeader
        title="Financeiro"
        description="Contas a pagar e a receber manuais, com a receita de vendas lida direto do Caixa."
      />

      {editId && !editingEntry ? (
        <Alert tone="warning">Lançamento não encontrado.</Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="A receber (pendente)"
          value={formatBRL(toReceive)}
          hint={`vence até ${formatDate(to)}`}
        />
        <Stat
          label="A pagar (pendente)"
          value={formatBRL(toPay)}
          hint={`vence até ${formatDate(to)}`}
          tone={toPay > 0 ? "warning" : "neutral"}
        />
        <Stat
          label="Recebido no período"
          value={formatBRL(receivedTotal)}
          hint={`inclui ${salesCount} ${salesCount === 1 ? "venda" : "vendas"} do Caixa`}
          tone="info"
        />
        <Stat
          label="Resultado previsto"
          value={formatBRL(forecast)}
          hint="a receber + vendas − a pagar"
          tone={forecast >= 0 ? "success" : "danger"}
        />
      </div>

      <div
        className={
          isAdmin ? "grid items-start gap-6 lg:grid-cols-[1fr_360px]" : "space-y-6"
        }
      >
        <div className="space-y-6">
          <Card>
            <form className="grid gap-3 border-b border-ink-200 p-4 sm:grid-cols-2 sm:items-end sm:px-6 lg:grid-cols-5">
              <div>
                <label className="label" htmlFor="kind">
                  Tipo
                </label>
                <select id="kind" name="kind" defaultValue={kind} className="input">
                  <option value="">Todos</option>
                  <option value="RECEBER">A receber</option>
                  <option value="PAGAR">A pagar</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="status">
                  Situação
                </label>
                <select
                  id="status"
                  name="status"
                  defaultValue={status}
                  className="input"
                >
                  <option value="pendentes">Pendentes</option>
                  <option value="PAGO">Pagos</option>
                  <option value="CANCELADO">Cancelados</option>
                  <option value="todos">Todos</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="de">
                  Vence de
                </label>
                <input
                  id="de"
                  name="de"
                  type="date"
                  defaultValue={from}
                  className="input"
                />
              </div>
              <div>
                <label className="label" htmlFor="ate">
                  Vence até
                </label>
                <input
                  id="ate"
                  name="ate"
                  type="date"
                  defaultValue={to}
                  className="input"
                />
              </div>
              <button type="submit" className="btn btn-secondary">
                <Search className="size-4" />
                Filtrar
              </button>
            </form>

            {entries.length === 0 ? (
              <EmptyState
                title="Nenhum lançamento no período"
                description="Ajuste os filtros ou registre manualmente uma conta a pagar ou a receber."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-ink-200 text-sm">
                  <thead className="table-head">
                    <tr>
                      <th className="px-5 py-3">Vencimento</th>
                      <th className="px-5 py-3">Descrição</th>
                      <th className="px-5 py-3">Categoria</th>
                      <th className="px-5 py-3">Tipo</th>
                      <th className="px-5 py-3 text-right">Valor</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {entries.map((entry) => {
                      const overdue =
                        entry.status === "PENDENTE" && entry.dueDate < today;
                      return (
                        <tr key={entry.id} className="hover:bg-ink-50">
                          <td className="whitespace-nowrap px-5 py-3 text-ink-600">
                            {formatDate(entry.dueDate)}
                          </td>
                          <td className="px-5 py-3">
                            <p className="font-medium text-ink-900">
                              {entry.description}
                            </p>
                            {entry.notes ? (
                              <p className="text-xs text-ink-500">{entry.notes}</p>
                            ) : null}
                          </td>
                          <td className="px-5 py-3 text-ink-600">
                            {entry.category ?? "—"}
                          </td>
                          <td className="px-5 py-3">
                            <Badge
                              tone={entry.kind === "RECEBER" ? "success" : "danger"}
                            >
                              {entry.kind === "RECEBER" ? "A receber" : "A pagar"}
                            </Badge>
                          </td>
                          <td
                            className={`whitespace-nowrap px-5 py-3 text-right font-semibold ${
                              entry.kind === "RECEBER"
                                ? "text-emerald-700"
                                : "text-red-700"
                            }`}
                          >
                            {formatBRL(entry.amountCents)}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex flex-wrap items-center gap-1">
                              <Badge tone={STATUS_TONES[entry.status]}>
                                {STATUS_LABELS[entry.status]}
                              </Badge>
                              {overdue ? <Badge tone="warning">Vencido</Badge> : null}
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            {isAdmin ? (
                              <EntryActions
                                entryId={entry.id}
                                status={entry.status}
                                editHref={financeHref(entry.id)}
                              />
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Receita de vendas no período"
              description="Somada diretamente das vendas do módulo Caixa (status PAGA). Não vira lançamento aqui para não duplicar a receita."
            />
            <div className="card-pad flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-2xl font-bold text-ink-900">
                {formatBRL(salesRevenue)}
              </p>
              <p className="text-sm text-ink-500">
                {salesCount} {salesCount === 1 ? "venda paga" : "vendas pagas"}{" "}
                entre {formatDate(from)} e {formatDate(to)}
              </p>
            </div>
          </Card>
        </div>

        {isAdmin ? (
          <EntryForm
            key={editingEntry ? editingEntry.id : "new"}
            entry={editingEntry ?? undefined}
            cancelHref={financeHref()}
          />
        ) : null}
      </div>
    </>
  );
}
