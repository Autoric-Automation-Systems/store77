import Link from "next/link";
import { and, asc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { customers, sales } from "@/db/schema";
import { isAdminRole, requireUser } from "@/lib/auth";
import { formatBRL } from "@/lib/format";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { CustomerForm, DeleteCustomerButton } from "./customer-form";

export const metadata = { title: "Clientes" };

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; editar?: string }>;
}) {
  const user = await requireUser();
  const { q = "", editar = "" } = await searchParams;
  const term = q.trim();
  const storeId = user.storeId;
  const isAdmin = isAdminRole(user.role);

  const filters: SQL[] = [eq(customers.storeId, storeId)];
  if (term) {
    const pattern = `%${term}%`;
    const search = or(
      ilike(customers.name, pattern),
      ilike(customers.phone, pattern),
      ilike(customers.document, pattern),
    );
    if (search) filters.push(search);
  }

  const [rows, editing] = await Promise.all([
    db()
      .select({
        id: customers.id,
        name: customers.name,
        email: customers.email,
        phone: customers.phone,
        document: customers.document,
        address: customers.address,
        notes: customers.notes,
        purchaseCount: sql<number>`(select count(*) from ${sales} where ${sales.customerId} = ${customers.id} and ${sales.storeId} = ${storeId} and ${sales.status} = 'PAGA')::int`,
        totalSpentCents: sql<number>`(select coalesce(sum(${sales.totalCents}), 0) from ${sales} where ${sales.customerId} = ${customers.id} and ${sales.storeId} = ${storeId} and ${sales.status} = 'PAGA')::int`,
      })
      .from(customers)
      .where(and(...filters))
      .orderBy(asc(customers.name))
      .limit(100),

    editar
      ? db()
          .select({
            id: customers.id,
            name: customers.name,
            email: customers.email,
            phone: customers.phone,
            document: customers.document,
            address: customers.address,
            notes: customers.notes,
          })
          .from(customers)
          .where(
            and(eq(customers.id, editar), eq(customers.storeId, storeId)),
          )
          .limit(1)
      : Promise.resolve([]),
  ]);

  const editingCustomer = editing[0] ?? null;

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Cadastro de clientes com histórico de compras registradas no PDV."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader
            title="Clientes cadastrados"
            description="Últimos 100 clientes da loja."
            action={
              <form className="flex gap-2">
                <input
                  type="search"
                  name="q"
                  defaultValue={term}
                  className="input py-2 text-xs"
                  placeholder="Nome, telefone ou documento"
                />
                <button type="submit" className="btn btn-secondary px-3 py-2 text-xs">
                  Buscar
                </button>
              </form>
            }
          />

          {rows.length === 0 ? (
            <EmptyState
              title="Nenhum cliente encontrado"
              description="Cadastre um cliente ao lado para vincular vendas e histórico de compras."
            />
          ) : (
            <ul className="divide-y divide-ink-100">
              {rows.map((customer) => (
                <li
                  key={customer.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900">{customer.name}</p>
                    <p className="text-xs text-ink-500">
                      {[customer.phone, customer.document, customer.email]
                        .filter(Boolean)
                        .join(" · ") || "Sem contato cadastrado"}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-ink-900">
                        {formatBRL(customer.totalSpentCents)}
                      </p>
                      <Badge tone={customer.purchaseCount > 0 ? "success" : "neutral"}>
                        {customer.purchaseCount} compra
                        {customer.purchaseCount === 1 ? "" : "s"}
                      </Badge>
                    </div>

                    <Link
                      href={`/clientes?editar=${customer.id}`}
                      className="btn btn-secondary px-3 py-1.5 text-xs"
                    >
                      Editar
                    </Link>

                    {isAdmin ? (
                      <DeleteCustomerButton id={customer.id} name={customer.name} />
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <CustomerForm
          key={editingCustomer?.id ?? "novo"}
          customer={editingCustomer}
        />
      </div>
    </>
  );
}
