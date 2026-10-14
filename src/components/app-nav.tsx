"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  BarChart3,
  Boxes,
  CircleHelp,
  Globe2,
  LayoutDashboard,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  Tags,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { UserRole } from "@/db/schema";
import { isAdminRole } from "@/lib/roles";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
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
      { href: "/estoque/movimentacoes", label: "Movimentações", icon: ArrowLeftRight },
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
      { href: "/financeiro", label: "Financeiro", icon: BarChart3, adminOnly: true },
      { href: "/vitrine", label: "Vitrine online", icon: Globe2 },
      { href: "/usuarios", label: "Equipe", icon: ShieldCheck, adminOnly: true },
    ],
  },
  {
    title: "Suporte",
    items: [{ href: "/ajuda", label: "Ajuda", icon: CircleHelp }],
  },
];

/** O href mais específico que casa com a URL atual define o item ativo. */
function activeHref(pathname: string, hrefs: string[]): string | null {
  let best: string | null = null;
  for (const href of hrefs) {
    const matches = pathname === href || pathname.startsWith(`${href}/`);
    if (matches && (best === null || href.length > best.length)) best = href;
  }
  return best;
}

export function AppNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const groups = GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.adminOnly || isAdminRole(role)),
  })).filter((group) => group.items.length > 0);

  const hrefs = groups.flatMap((group) => group.items.map((item) => item.href));
  const active = activeHref(pathname, hrefs);

  return (
    <>
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
            href="https://github.com/Autoric-Automation-Systems"
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
      </nav>

      <nav className="flex gap-1 overflow-x-auto border-b border-ink-200 bg-white px-3 py-2 lg:hidden">
        {groups
          .flatMap((group) => group.items)
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active === item.href ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active === item.href
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink-600 hover:bg-ink-50"
              }`}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
      </nav>
    </>
  );
}
