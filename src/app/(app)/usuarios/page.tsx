import Link from "next/link";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, type UserRole } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/roles";
import { Badge, Card, CardHeader, PageHeader, Stat } from "@/components/ui";
import { MemberActions } from "./member-actions";
import {
  ChangePasswordForm,
  EditMemberForm,
  ResetPasswordForm,
  TeamMemberForm,
} from "./team-forms";

export const metadata = { title: "Equipe" };

const ROLE_TONES: Record<UserRole, "neutral" | "info" | "success" | "warning"> = {
  OWNER: "info",
  GERENTE: "success",
  VENDEDOR: "warning",
  CLIENTE: "neutral",
};

type Search = {
  edit?: string;
  senha?: string;
};

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const user = await requireAdmin();
  const { edit = "", senha = "" } = await searchParams;

  const [rows, summary] = await Promise.all([
    db()
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        active: users.active,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.storeId, user.storeId))
      .orderBy(desc(users.active), asc(users.name)),

    db()
      .select({
        activeTotal: sql<number>`count(*) filter (where ${users.active})::int`,
        activeTeam: sql<number>`count(*) filter (where ${users.active} and ${users.role} <> 'CLIENTE')::int`,
        activeClients: sql<number>`count(*) filter (where ${users.active} and ${users.role} = 'CLIENTE')::int`,
      })
      .from(users)
      .where(eq(users.storeId, user.storeId)),
  ]);

  const stats = summary[0] ?? {
    activeTotal: 0,
    activeTeam: 0,
    activeClients: 0,
  };

  const activeOwners = rows.filter(
    (row) => row.active && row.role === "OWNER",
  ).length;

  const editing = edit ? rows.find((row) => row.id === edit) : undefined;
  const resetting = senha ? rows.find((row) => row.id === senha) : undefined;

  return (
    <>
      <PageHeader
        title="Equipe"
        description="Acessos da loja, papéis e senhas. Somente o proprietário deixa a loja sem administrador."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Membros ativos" value={String(stats.activeTotal)} />
        <Stat label="Equipe (owner, gerente e vendedor)" value={String(stats.activeTeam)} />
        <Stat label="Clientes" value={String(stats.activeClients)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="h-fit">
          <CardHeader
            title="Membros"
            description="Desative um acesso para bloqueá-lo sem perder o histórico."
          />
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-ink-200 text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-5 py-3">Membro</th>
                  <th className="px-5 py-3">Papel</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Criado em</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rows.map((row) => {
                  const isSelf = row.id === user.id;
                  const isLastOwner = row.active && row.role === "OWNER" && activeOwners <= 1;

                  return (
                    <tr key={row.id} className="hover:bg-ink-50">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-ink-900">
                          {row.name}
                          {isSelf ? (
                            <span className="ml-2 text-xs font-normal text-ink-500">
                              (você)
                            </span>
                          ) : null}
                        </p>
                        <p className="text-xs text-ink-500">{row.email}</p>
                        {row.phone ? (
                          <p className="text-xs text-ink-500">{row.phone}</p>
                        ) : null}
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={ROLE_TONES[row.role]}>
                          {ROLE_LABELS[row.role]}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        {row.active ? (
                          <Badge tone="success">Ativo</Badge>
                        ) : (
                          <Badge tone="neutral">Inativo</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3 text-ink-600">
                        {formatDateTime(row.createdAt)}
                      </td>
                      <td className="px-5 py-3">
                        <MemberActions
                          member={{
                            id: row.id,
                            name: row.name,
                            active: row.active,
                            isSelf,
                            isLastOwner,
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-ink-200 px-5 py-3 text-right">
            <Link
              href={`/usuarios?edit=${user.id}`}
              className="text-xs font-semibold text-brand-600"
            >
              Editar meus dados
            </Link>
          </div>
        </Card>

        <div className="space-y-6">
          <TeamMemberForm />

          {editing ? (
            <EditMemberForm
              key={editing.id}
              member={{
                id: editing.id,
                name: editing.name,
                phone: editing.phone,
                role: editing.role,
              }}
              roleLocked={
                editing.id === user.id ||
                (editing.active &&
                  editing.role === "OWNER" &&
                  activeOwners <= 1)
              }
            />
          ) : null}

          {resetting ? (
            <ResetPasswordForm member={{ id: resetting.id, name: resetting.name }} />
          ) : null}

          <ChangePasswordForm />
        </div>
      </div>
    </>
  );
}
