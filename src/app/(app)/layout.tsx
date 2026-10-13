import { logoutAction } from "@/app/actions/auth";
import { AppNav } from "@/components/app-nav";
import { Brand } from "@/components/brand";
import { ROLE_LABELS, requireUser } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col bg-ink-100">
      <header className="border-b border-ink-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Brand href="/dashboard" className="h-9" />
            <span className="hidden h-6 w-px bg-ink-200 sm:block" />
            <span className="hidden text-sm font-medium text-ink-600 sm:block">
              {user.storeName}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold leading-tight text-ink-900">
                {user.name}
              </p>
              <p className="text-xs text-ink-500">
                {ROLE_LABELS[user.role]}
              </p>
            </div>
            <form action={logoutAction}>
              <button type="submit" className="btn btn-secondary px-3 py-2">
                Sair
              </button>
            </form>
          </div>
        </div>
        <div className="lg:hidden">
          <AppNav role={user.role} />
        </div>
      </header>

      <div className="flex flex-1 items-stretch">
        <AppNav role={user.role} />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
