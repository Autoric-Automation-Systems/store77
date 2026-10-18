"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  BarChart3,
  Boxes,
  CircleHelp,
  CreditCard,
  Globe2,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  Tags,
  Users,
  Wallet,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import type { UserRole } from "@/db/schema";
import { COMPANY } from "@/lib/legal";
import { ROLE_LABELS, isPathAllowed } from "@/lib/roles";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Visão geral",
    items: [{ href: "/dashboard", label: "Painel", icon: LayoutDashboard }],
  },
  {
    title: "Estoque",
    items: [
      { href: "/estoque", label: "Produtos", icon: Boxes },
      {
        href: "/estoque/movimentacoes",
        label: "Movimentações",
        icon: ArrowLeftRight,
      },
      { href: "/estoque/categorias", label: "Tipos e nichos", icon: Tags },
    ],
  },
  {
    title: "Vendas",
    items: [
      { href: "/caixa", label: "PDV / Carrinho", icon: ShoppingCart },
      { href: "/caixa/vendas", label: "Vendas", icon: Receipt },
      { href: "/caixa/sessoes", label: "Sessões de caixa", icon: Wallet },
      { href: "/clientes", label: "Clientes", icon: Users },
    ],
  },
  {
    title: "Gestão",
    items: [
      { href: "/financeiro", label: "Financeiro", icon: BarChart3 },
      { href: "/vitrine", label: "Vitrine online", icon: Globe2 },
      { href: "/usuarios", label: "Equipe", icon: ShieldCheck },
      { href: "/assinatura", label: "Assinatura", icon: CreditCard },
    ],
  },
  {
    title: "Suporte",
    items: [{ href: "/ajuda", label: "Ajuda", icon: CircleHelp }],
  },
];

/**
 * Quais itens são restritos vem de `isAdminOnlyPath`, a mesma lista que espelha
 * os `requireAdmin()` das páginas — assim o menu não pode divergir.
 */
function visibleGroups(role: UserRole) {
  return GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => isPathAllowed(role, item.href)),
  })).filter((group) => group.items.length > 0);
}

/** O href mais específico que casa com a URL atual define o item ativo. */
function activeHref(pathname: string, hrefs: string[]): string | null {
  let best: string | null = null;
  for (const href of hrefs) {
    const matches = pathname === href || pathname.startsWith(`${href}/`);
    if (matches && (best === null || href.length > best.length)) best = href;
  }
  return best;
}

function Credits() {
  return (
    <div className="mt-6 border-t border-ink-100 pt-4">
      <div className="flex flex-wrap gap-x-3 gap-y-1 px-3">
        <Link href="/termos" className="text-xs text-ink-400 hover:text-ink-700">
          Termos
        </Link>
        <Link
          href="/privacidade"
          className="text-xs text-ink-400 hover:text-ink-700"
        >
          Privacidade
        </Link>
      </div>
      <Link
        href={COMPANY.site}
        target="_blank"
        rel="noreferrer"
        className="mt-3 flex items-center gap-2 px-3"
      >
        <Image
          src="/logoDev.png"
          alt="AUTORIC — Automação e Sistemas"
          width={1160}
          height={323}
          className="h-5 w-auto opacity-70 transition hover:opacity-100"
        />
      </Link>
    </div>
  );
}

/** Menu vertical, somente no desktop. */
export function AppSidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const groups = visibleGroups(role);
  const hrefs = groups.flatMap((group) => group.items.map((item) => item.href));
  const active = activeHref(pathname, hrefs);

  return (
    <nav className="hidden w-64 shrink-0 flex-col border-r border-ink-200 bg-white px-4 py-6 lg:flex">
      <div className="flex flex-1 flex-col gap-6">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="px-3 text-xs font-semibold uppercase tracking-wide text-ink-400">
              {group.title}
            </p>
            <ul className="mt-2 space-y-1">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
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

      <Credits />
    </nav>
  );
}

/**
 * No celular o menu é uma gaveta sobreposta (`fixed`) em vez de uma barra no
 * fluxo: assim ele não disputa largura com o conteúdo nem provoca rolagem
 * horizontal da página, e cabem todos os itens sem rolagem lateral.
 */
export function MobileNav({
  role,
  userName,
}: {
  role: UserRole;
  userName: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Fecha ao navegar, para a gaveta não ficar aberta atrás da próxima tela.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);

    // Trava a rolagem do fundo enquanto a gaveta está aberta.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  const groups = visibleGroups(role);
  const hrefs = groups.flatMap((group) => group.items.map((item) => item.href));
  const active = activeHref(pathname, hrefs);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
        aria-expanded={open}
        className="btn btn-ghost -ml-2 px-2.5 py-2 lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full bg-ink-900/40"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="absolute inset-y-0 left-0 flex w-[85%] max-w-xs flex-col bg-white shadow-xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-ink-200 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink-900">
                  {userName}
                </p>
                <p className="text-xs text-ink-500">{ROLE_LABELS[role]}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
                className="btn btn-ghost px-2 py-2"
              >
                <X className="size-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
              {groups.map((group) => (
                <div key={group.title}>
                  <p className="px-3 text-xs font-semibold uppercase tracking-wide text-ink-400">
                    {group.title}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {group.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={active === item.href ? "page" : undefined}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
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

              <Credits />
            </nav>

            <div className="border-t border-ink-200 p-3">
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="btn btn-secondary w-full justify-start"
                >
                  <LogOut className="size-4" />
                  Sair da conta
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
