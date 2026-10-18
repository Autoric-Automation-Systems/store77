import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAffiliateAction } from "@/app/actions/affiliates";
import { Brand } from "@/components/brand";
import { requireAffiliate } from "@/lib/affiliates";

export const dynamic = "force-dynamic";

export default async function AffiliateAreaLayout({
  children,
}: {
  children: ReactNode;
}) {
  const affiliate = await requireAffiliate();

  return (
    <div className="flex min-h-screen flex-col bg-ink-100">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3">
            <Brand className="h-8" />
            <Link
              href="/afiliados/painel"
              className="text-sm font-semibold text-ink-800"
            >
              Área do afiliado
            </Link>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-ink-500 sm:inline">{affiliate.name}</span>
            <form action={logoutAffiliateAction}>
              <button type="submit" className="font-medium text-ink-600 hover:text-ink-900">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>

      <footer className="border-t border-ink-200 bg-white px-6 py-5">
        <div className="mx-auto flex max-w-5xl flex-wrap gap-x-5 gap-y-2 text-sm text-ink-500">
          <Link href="/afiliados" className="hover:text-ink-800">
            Regras do programa
          </Link>
          <Link href="/termos" className="hover:text-ink-800">
            Termos de Uso
          </Link>
          <Link href="/ajuda" className="hover:text-ink-800">
            Ajuda
          </Link>
        </div>
      </footer>
    </div>
  );
}
