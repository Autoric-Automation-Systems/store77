import Image from "next/image";
import Link from "next/link";
import { COMPANY, PRODUCT } from "@/lib/legal";

const LINKS = [
  { href: "/ajuda", label: "Ajuda" },
  { href: "/ajuda/planos", label: "Planos e preços" },
  { href: "/afiliados", label: "Afiliados" },
  { href: "/termos", label: "Termos de Uso" },
  { href: "/privacidade", label: "Política de Privacidade" },
];

/**
 * Rodapé das páginas públicas do Store77 (landing, políticas, ajuda).
 * Não use na vitrine do lojista: lá o rodapé é da loja, não da plataforma.
 *
 * `tone="dark"` acompanha a landing page, que usa fundo quase preto.
 */
export function SiteFooter({ tone = "light" }: { tone?: "light" | "dark" }) {
  const dark = tone === "dark";

  return (
    <footer
      className={
        dark ? "border-t border-white/10 bg-ink-950" : "border-t border-ink-200 bg-white"
      }
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className={`text-sm font-semibold ${dark ? "text-white" : "text-ink-800"}`}>
            {PRODUCT.name}
          </p>
          <p className={`mt-1 text-xs ${dark ? "text-ink-400" : "text-ink-500"}`}>
            {PRODUCT.tagline}
          </p>
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                dark
                  ? "text-sm font-medium text-ink-300 transition hover:text-white"
                  : "text-sm font-medium text-ink-600 transition hover:text-brand-700"
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className={dark ? "border-t border-white/10" : "border-t border-ink-100"}>
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className={`text-xs ${dark ? "text-ink-400" : "text-ink-500"}`}>
            © {new Date().getFullYear()} {PRODUCT.name}. Todos os direitos
            reservados.
          </p>
          <Link
            href={COMPANY.site}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center gap-2.5 text-xs transition ${
              dark ? "text-ink-400 hover:text-white" : "text-ink-500 hover:text-ink-700"
            }`}
          >
            Desenvolvido por
            <Image
              src="/logoDev.png"
              alt="AUTORIC — Automação e Sistemas"
              width={1160}
              height={323}
              className="h-5 w-auto sm:h-6"
            />
          </Link>
        </div>
      </div>
    </footer>
  );
}
