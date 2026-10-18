"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Menu,
  Package,
  Store,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = { href: string; label: string; icon: LucideIcon };

/**
 * Seções da administração interna. Item novo entra aqui e já aparece no menu
 * do desktop e do celular — o layout não precisa mudar.
 */
const SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Visão geral",
    items: [{ href: "/admin", label: "Painel", icon: LayoutDashboard }],
  },
  {
    title: "Comercial",
    items: [
      { href: "/admin/lojas", label: "Lojas", icon: Store },
      { href: "/admin/planos", label: "Planos", icon: Package },
      { href: "/admin/afiliados", label: "Afiliados", icon: Users },
    ],
  },
];

/** O href mais específico que casa com a URL atual define o item ativo. */
function activeHref(pathname: string, hrefs: string[]): string | null {
  let best: string | null = null;
  for (const href of hrefs) {
    if (pathname !== href && !pathname.startsWith(`${href}/`)) continue;
    if (best === null || href.length > best.length) best = href;
  }
  return best;
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = activeHref(
    pathname,
    SECTIONS.flatMap((section) => section.items.map((item) => item.href)),
  );

  return (
    <div className="space-y-5">
      {SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="px-3 text-xs font-semibold uppercase tracking-wide text-ink-400">
            {section.title}
          </p>
          <ul className="mt-2 space-y-1">
            {section.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active === item.href ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                    active === item.href
                      ? "bg-brand-50 text-brand-700"
                      : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
                  }`}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function AdminSidebar() {
  return (
    <nav
      aria-label="Seções da administração"
      className="hidden w-56 shrink-0 lg:block"
    >
      <div className="sticky top-20">
        <NavLinks />
      </div>
    </nav>
  );
}

/**
 * No celular o menu vira gaveta: são poucos itens hoje, mas a lista é a mesma
 * do desktop e cresce sem precisar de rolagem horizontal.
 */
export function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu da administração"
        aria-expanded={open}
        className="btn btn-ghost px-2.5 py-2 lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink-950/40"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col overflow-y-auto bg-white px-4 py-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="px-3 text-xs font-semibold uppercase tracking-wide text-ink-500">
                Administração
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
                className="btn btn-ghost px-2 py-2"
              >
                <X className="size-5" />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
