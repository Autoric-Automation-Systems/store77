import { and, desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  cashMovements,
  cashSessions,
  users,
  type CashMovement,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatBRL, formatDateTime, formatDateTimeShort } from "@/lib/format";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Stat,
} from "@/components/ui";
import {
  CashMovementForm,
  CloseCashForm,
  OpenCashForm,
} from "./session-forms";

export const metadata = { title: "Sessões de caixa" };

const MOVEMENT_LABELS = {
  ENTRADA: "Entrada",
  SAIDA: "Saída",
  SANGRIA: "Sangria",
  SUPRIMENTO: "Suprimento",
} as const;

const MOVEMENT_TONES = {
  ENTRADA: "success",
  SAIDA: "warning",
  SANGRIA: "danger",
  SUPRIMENTO: "info",
} as const;

const totalsSelection = {
  entradas: sql<number>`coalesce(sum(${cashMovements.amountCents}) filter (where ${cashMovements.type} = 'ENTRADA'), 0)::int`,
  saidas: sql<number>`coalesce(sum(${cashMovements.amountCents}) filter (where ${cashMovements.type} = 'SAIDA'), 0)::int`,
  sangrias: sql<number>`coalesce(sum(${cashMovements.amountCents}) filter (where ${cashMovements.type} = 'SANGRIA'), 0)::int`,
  suprimentos: sql<number>`coalesce(sum(${cashMovements.amountCents}) filter (where ${cashMovements.type} = 'SUPRIMENTO'), 0)::int`,
};

type SessionTotals = {
  entradas: number;
  saidas: number;
  sangrias: number;
  suprimentos: number;
};

const emptyTotals: SessionTotals = {
  entradas: 0,
  saidas: 0,
  sangrias: 0,
  suprimentos: 0,
};

type SessionMovement = {
  id: string;
  type: CashMovement["type"];
  amountCents: number;
  description: string | null;
  createdAt: Date;
  userName: string | null;
};

/** Valor esperado em dinheiro: fundo + entradas - saídas - sangrias + suprimentos. */
function expectedCents(openingAmountCents: number, totals: SessionTotals): number {
  return (
    openingAmountCents +
    totals.entradas -
    totals.saidas -
    totals.sangrias +
    totals.suprimentos
  );
}

export default async function SessoesCaixaPage() {
  const user = await requireUser();
  const storeId = user.storeId;
  const opener = alias(users, "opener");
  const closer = alias(users, "closer");

  const [openRows, closedRows] = await Promise.all([
    db()
      .select({
        id: cashSessions.id,
        openedAt: cashSessions.openedAt,
        openingAmountCents: cashSessions.openingAmountCents,
        notes: cashSessions.notes,
        openedByName: users.name,
      })
      .from(cashSessions)
      .leftJoin(users, eq(users.id, cashSessions.openedById))
      .where(
        and(eq(cashSessions.storeId, storeId), eq(cashSessions.status, "ABERTO")),
      )
      .limit(1),

    db()
      .select({
        id: cashSessions.id,
        openedAt: cashSessions.openedAt,
        closedAt: cashSessions.closedAt,
        openingAmountCents: cashSessions.openingAmountCents,
        closingAmountCents: cashSessions.closingAmountCents,
        openedByName: opener.name,
        closedByName: closer.name,
        ...totalsSelection,
      })
      .from(cashSessions)
      .leftJoin(cashMovements, eq(cashMovements.cashSessionId, cashSessions.id))
      .leftJoin(opener, eq(opener.id, cashSessions.openedById))
      .leftJoin(closer, eq(closer.id, cashSessions.closedById))
      .where(
        and(eq(cashSessions.storeId, storeId), eq(cashSessions.status, "FECHADO")),
      )
      .groupBy(
        cashSessions.id,
        cashSessions.openedAt,
        cashSessions.closedAt,
        cashSessions.openingAmountCents,
        cashSessions.closingAmountCents,
        opener.name,
        closer.name,
      )
      .orderBy(desc(cashSessions.closedAt))
      .limit(20),
  ]);

  const openSession = openRows[0];

  let openTotals: SessionTotals | undefined;
  let openMovements: SessionMovement[] = [];

  if (openSession) {
    const [totalsRows, movementRows] = await Promise.all([
      db()
        .select(totalsSelection)
        .from(cashMovements)
        .where(eq(cashMovements.cashSessionId, openSession.id)),

      db()
        .select({
          id: cashMovements.id,
          type: cashMovements.type,
          amountCents: cashMovements.amountCents,
          description: cashMovements.description,
          createdAt: cashMovements.createdAt,
          userName: users.name,
        })
        .from(cashMovements)
        .leftJoin(users, eq(users.id, cashMovements.userId))
        .where(eq(cashMovements.cashSessionId, openSession.id))
        .orderBy(desc(cashMovements.createdAt))
        .limit(20),
    ]);

    openTotals = totalsRows[0] ?? emptyTotals;
    openMovements = movementRows;
  }

  const openExpected = openSession
    ? expectedCents(openSession.openingAmountCents, openTotals ?? emptyTotals)
    : 0;

  return (
    <>
      <PageHeader
        title="Sessões de caixa"
        description="Abra o caixa no início do turno, registre sangrias e suprimentos e confira o dinheiro no fechamento."
      />

      {openSession ? (
        <>
          <Card>
            <CardHeader
              title="Sessão aberta"
              description={`Aberta em ${formatDateTime(openSession.openedAt)}${
                openSession.openedByName ? ` por ${openSession.openedByName}` : ""
              }.`}
              action={<Badge tone="success">Aberta</Badge>}
            />

            <div className="card-pad grid grid-cols-2 gap-4 lg:grid-cols-3">
              <Stat
                label="Fundo de troco"
                value={formatBRL(openSession.openingAmountCents)}
              />
              <Stat
                label="Entradas"
                value={formatBRL(openTotals?.entradas ?? 0)}
                tone="success"
              />
              <Stat
                label="Saídas"
                value={formatBRL(openTotals?.saidas ?? 0)}
                tone="warning"
              />
              <Stat
                label="Sangrias"
                value={formatBRL(openTotals?.sangrias ?? 0)}
                tone="danger"
              />
              <Stat
                label="Suprimentos"
                value={formatBRL(openTotals?.suprimentos ?? 0)}
                tone="info"
              />
              <Stat
                label="Esperado em dinheiro"
                value={formatBRL(openExpected)}
                hint="Fundo + entradas - saídas - sangrias + suprimentos"
                tone="info"
              />
            </div>

            {openSession.notes ? (
              <p className="border-t border-ink-200 px-3 py-3 sm:px-5 text-sm text-ink-500 sm:px-6">
                {openSession.notes}
              </p>
            ) : null}
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Últimos movimentos"
                description="Lançamentos da sessão aberta."
              />
              {openMovements.length === 0 ? (
                <EmptyState
                  title="Nenhum movimento"
                  description="Registre sangrias, suprimentos e movimentos avulsos ao lado."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-ink-200 text-sm">
                    <thead className="table-head">
                      <tr>
                        <th className="px-3 py-3 sm:px-5">Data</th>
                        <th className="px-3 py-3 sm:px-5">Tipo</th>
                        <th className="hidden px-3 py-3 sm:table-cell sm:px-5">
                          Descrição
                        </th>
                        <th className="px-3 py-3 text-right sm:px-5">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100">
                      {openMovements.map((movement) => (
                        <tr key={movement.id} className="hover:bg-ink-50">
                          <td className="whitespace-nowrap px-3 py-3 text-ink-500 sm:px-5">
                            <span className="sm:hidden">
                              {formatDateTimeShort(movement.createdAt)}
                            </span>
                            <span className="hidden sm:inline">
                              {formatDateTime(movement.createdAt)}
                            </span>
                          </td>
                          <td className="px-3 py-3 sm:px-5">
                            <Badge tone={MOVEMENT_TONES[movement.type]}>
                              {MOVEMENT_LABELS[movement.type]}
                            </Badge>
                          </td>
                          <td className="px-3 py-3 sm:px-5 text-ink-600">
                            {movement.description ?? "—"}
                            {movement.userName ? (
                              <span className="block text-xs text-ink-400">
                                {movement.userName}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-3 py-3 sm:px-5 text-right font-semibold">
                            {movement.type === "ENTRADA" ||
                            movement.type === "SUPRIMENTO"
                              ? "+"
                              : "-"}
                            {formatBRL(movement.amountCents).replace("-", "")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <div className="space-y-6">
              <CashMovementForm />
              <CloseCashForm expectedCents={openExpected} />
            </div>
          </div>
        </>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader
              title="Nenhuma sessão aberta"
              description="Abra o caixa para acompanhar o dinheiro do turno."
            />
            <EmptyState
              title="Caixa fechado"
              description="Vendas em dinheiro continuam sendo registradas, mas só entram no caixa quando houver uma sessão aberta."
            />
          </Card>
          <OpenCashForm />
        </div>
      )}

      <Card>
        <CardHeader
          title="Histórico de sessões"
          description="Últimas 20 sessões encerradas, com a diferença da conferência de dinheiro."
        />
        {closedRows.length === 0 ? (
          <EmptyState title="Nenhuma sessão encerrada ainda" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-ink-200 text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-3 py-3 sm:px-5">Abertura</th>
                  <th className="hidden px-3 py-3 sm:table-cell sm:px-5">
                    Fechamento
                  </th>
                  <th className="hidden px-3 py-3 lg:table-cell lg:px-5">
                    Operadores
                  </th>
                  <th className="hidden px-3 py-3 text-right sm:table-cell sm:px-5">
                    Fundo
                  </th>
                  <th className="hidden px-3 py-3 text-right lg:table-cell lg:px-5">
                    Contado
                  </th>
                  <th className="hidden px-3 py-3 text-right lg:table-cell lg:px-5">
                    Esperado
                  </th>
                  <th className="px-3 py-3 text-right sm:px-5">Diferença</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {closedRows.map((session) => {
                  const expected = expectedCents(
                    session.openingAmountCents,
                    session,
                  );
                  const difference =
                    (session.closingAmountCents ?? 0) - expected;

                  return (
                    <tr key={session.id} className="hover:bg-ink-50">
                      <td className="whitespace-nowrap px-3 py-3 text-ink-500 sm:px-5">
                        <span className="sm:hidden">
                          {formatDateTimeShort(session.openedAt)}
                        </span>
                        <span className="hidden sm:inline">
                          {formatDateTime(session.openedAt)}
                        </span>
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-3 text-ink-500 sm:table-cell sm:px-5">
                        {formatDateTime(session.closedAt)}
                      </td>
                      <td className="hidden px-3 py-3 text-ink-600 lg:table-cell lg:px-5">
                        {session.openedByName ?? "—"}
                        <span className="block text-xs text-ink-400">
                          Encerrada por {session.closedByName ?? "—"}
                        </span>
                      </td>
                      <td className="hidden px-3 py-3 text-right sm:table-cell sm:px-5">
                        {formatBRL(session.openingAmountCents)}
                      </td>
                      <td className="hidden px-3 py-3 text-right lg:table-cell lg:px-5">
                        {formatBRL(session.closingAmountCents)}
                      </td>
                      <td className="hidden px-3 py-3 text-right text-ink-600 lg:table-cell lg:px-5">
                        {formatBRL(expected)}
                      </td>
                      <td className="px-3 py-3 text-right sm:px-5">
                        {difference === 0 ? (
                          <Badge tone="neutral">Sem diferença</Badge>
                        ) : (
                          <Badge tone={difference > 0 ? "success" : "warning"}>
                            {difference > 0 ? "Sobra " : "Falta "}
                            {formatBRL(Math.abs(difference))}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
