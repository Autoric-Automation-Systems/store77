import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { AdminMobileNav, AdminSidebar } from "@/components/admin-nav";
import { Brand } from "@/components/brand";
import { requirePlatformAdmin } from "@/lib/platform";
import { ROLE_LABELS } from "@/lib/roles";

export const metadata = { title: "Administração interna" };
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requirePlatformAdmin();

  return (
    <div className="min-h-screen bg-ink-100">
      <header className="sticky top-0 z-30 border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <AdminMobileNav />
            <Brand href="/admin" className="h-8" />
            <span className="badge bg-ink-900 text-white">Interno</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/dashboard" className="text-ink-600 underline">
              Voltar ao app
            </Link>
            <span className="hidden text-ink-500 sm:inline">
              {user.name} · {ROLE_LABELS[user.role]}
            </span>
            <form action={logoutAction}>
              <button type="submit" className="btn btn-secondary px-3 py-1.5">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        <AdminSidebar />
        <main className="min-w-0 flex-1 space-y-5">{children}</main>
      </div>
    </div>
  );
}
