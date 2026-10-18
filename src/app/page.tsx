import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgePercent,
  BarChart3,
  Boxes,
  CreditCard,
  Globe2,
  ScanBarcode,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Brand } from "@/components/brand";
import {
  DEFAULT_COMMISSION_BP,
  DEFAULT_COMMISSION_MONTHS,
} from "@/lib/billing/plans";
import { SiteFooter } from "@/components/site-footer";

const MODULES = [
  {
    icon: Boxes,
    title: "Estoque",
    text: "Cadastro por tipo/nicho, código, fotos, endereço de armazenagem e alerta de mínimo.",
  },
  {
    icon: ScanBarcode,
    title: "Movimentações",
    text: "Entradas, saídas e ajustes com histórico auditável e saldo após cada lançamento.",
  },
  {
    icon: CreditCard,
    title: "Caixa",
    text: "Abertura e fechamento de turno, carrinho de venda, sangria, suprimento e conferência.",
  },
  {
    icon: BarChart3,
    title: "Financeiro",
    text: "Contas a receber e a pagar, vencimentos e baixa de pagamento.",
  },
  {
    icon: Globe2,
    title: "Vitrine automática",
    text: "Landing page gerada a partir do estoque real: hero, logo, paleta e carrossel por categoria.",
  },
  {
    icon: Users,
    title: "Equipe e papéis",
    text: "Proprietário, gerente, vendedor e cliente, cada um com o acesso que precisa.",
  },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-ink-950 text-white">
      {/* Brilho da marca: dois focos vermelhos em degradê sobre o quase-preto. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-64 h-[720px] bg-[radial-gradient(60%_60%_at_70%_20%,rgba(192,16,32,0.45),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-96 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(224,52,66,0.18),transparent_65%)]"
      />

      {/* Barra clara sobre o fundo escuro: o logo tem letra preta e some no quase-preto. */}
      <header className="relative px-3 pt-3 sm:px-5 sm:pt-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between rounded-2xl border border-white/40 bg-ink-50/95 px-4 py-2.5 shadow-lg shadow-black/40 backdrop-blur">
          <Brand className="h-9" priority />
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/afiliados"
              className="hidden px-3 text-sm font-medium text-ink-600 transition hover:text-ink-900 sm:inline"
            >
              Afiliados
            </Link>
            <Link
              href="/ajuda/planos"
              className="btn btn-ghost text-ink-600 hover:bg-ink-200/70 hover:text-ink-900"
            >
              Planos
            </Link>
            <Link
              href="/login"
              className="btn btn-ghost text-ink-600 hover:bg-ink-200/70 hover:text-ink-900"
            >
              Entrar
            </Link>
            <Link href="/cadastro" className="btn btn-primary">
              Criar minha loja
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <span className="badge border border-brand-500/30 bg-brand-500/10 text-brand-200">
              <ShieldCheck className="size-3.5" />
              Comece pelo controle de estoque
            </span>
            <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
              Um sistema para a loja física e para a{" "}
              <span className="bg-gradient-to-r from-brand-400 via-brand-300 to-brand-500 bg-clip-text text-transparent">
                loja online
              </span>
              .
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-300">
              Cadastre o estoque uma única vez e ele alimenta o caixa, o
              financeiro e a vitrine pública da sua loja. Sem planilha paralela,
              sem retrabalho.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/cadastro" className="btn btn-primary px-6 py-3 text-base">
                Começar agora
              </Link>
              <Link
                href="/login"
                className="btn border border-white/15 bg-white/5 px-6 py-3 text-base text-white hover:bg-white/10"
              >
                Já tenho conta
              </Link>
            </div>
            <p className="mt-4 text-sm text-ink-400">
              14 dias grátis, sem cartão. A partir de R$ 19,90/mês por loja.
            </p>
          </div>

          <div className="relative">
            <div
              aria-hidden
              className="absolute -inset-4 rounded-[2rem] bg-brand-600/20 blur-2xl"
            />
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
              {/* Foto: Vitaly Gariev / Unsplash. Trocar aqui e em /afiliados/[code]. */}
              <Image
                src="/hero-loja.jpg"
                alt="Vendedora apresenta um casaco a uma cliente sorridente em uma loja de roupas"
                fill
                priority
                sizes="(min-width: 1024px) 520px, 100vw"
                className="object-cover"
              />
            </div>
            <div className="absolute -bottom-5 left-4 rounded-2xl border border-white/10 bg-ink-900/90 px-4 py-3 shadow-xl backdrop-blur sm:left-8">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                Venda do dia
              </p>
              <p className="text-lg font-bold text-white">R$ 248,00</p>
              <p className="text-xs text-emerald-400">
                estoque atualizado na hora
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 pb-20">
        <div className="relative overflow-hidden rounded-3xl border border-brand-500/30 bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 px-6 py-10 shadow-2xl sm:px-10 sm:py-12">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-24 size-80 rounded-full bg-white/10 blur-2xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-28 right-32 size-56 rounded-full bg-black/20 blur-2xl"
          />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <span className="badge bg-black/25 text-white">
                <BadgePercent className="size-3.5" />
                Programa de afiliados
              </span>
              <h2 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">
                Indique o Store77 e ganhe comissão todo mês.
              </h2>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-brand-50">
                {DEFAULT_COMMISSION_BP / 100}% sobre cada fatura paga pela loja
                que você indicar, por até {DEFAULT_COMMISSION_MONTHS} meses.
                Cadastro imediato, link pronto na hora e extrato com repasse por
                Pix.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
              <Link
                href="/afiliados/cadastro"
                className="btn bg-white px-6 py-3 text-brand-700 shadow-lg hover:bg-brand-50"
              >
                Quero ser afiliado
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/afiliados"
                className="text-sm font-medium text-brand-50 underline decoration-white/40 underline-offset-4 hover:text-white"
              >
                Conhecer as regras
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">
            Tudo conversa entre si
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((module) => (
              <article
                key={module.title}
                className="group rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-brand-400/40 hover:bg-white/[0.07]"
              >
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300 transition group-hover:bg-brand-500/25">
                  <module.icon className="size-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-white">
                  {module.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-300">
                  {module.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter tone="dark" />
    </main>
  );
}
