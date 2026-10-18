import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "@/components/brand";
import { SiteFooter } from "@/components/site-footer";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-ink-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Brand className="h-9" />
          <nav className="flex items-center gap-3 text-sm">
            <Link
              href="/ajuda/planos"
              className="hidden font-medium text-ink-600 hover:text-ink-900 sm:inline"
            >
              Planos
            </Link>
            <Link
              href="/ajuda"
              className="font-medium text-ink-600 hover:text-ink-900"
            >
              Ajuda
            </Link>
            <Link href="/login" className="btn btn-primary px-3.5 py-2">
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <SiteFooter />
    </div>
  );
}
