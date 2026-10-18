import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Boxes,
  Check,
  CreditCard,
  Globe2,
  ScanBarcode,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { SiteFooter } from "@/components/site-footer";
import { findActiveAffiliateByCode, referralSignupHref } from "@/lib/affiliates";
import { PUBLIC_PLANS } from "@/lib/billing/plans";
import { formatBRL } from "@/lib/format";

/**
 * Página de vendas de cada afiliado.
 *
 * Quem recebe o link não vê um formulário: vê a proposta do produto e um único
 * CTA, que leva ao cadastro com o código de indicação já embutido.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const affiliate = await findActiveAffiliateByCode(code);
  if (!affiliate) return { title: "Indicação não encontrada" };

  const firstName = affiliate.name.split(" ")[0];
  return {
    title: `${firstName} indica o Store77`,
    description:
      "Estoque, caixa, financeiro e vitrine online em um só sistema. 14 dias grátis, sem cartão.",
  };
}

const MODULES = [
  { icon: Boxes, title: "Estoque", text: "Produtos, fotos, código de barras e alerta de reposição." },
  { icon: ScanBarcode, title: "Movimentações", text: "Entradas, saídas e ajustes com histórico auditável." },
  { icon: CreditCard, title: "Caixa", text: "Turno, carrinho, sangria e fechamento com conferência." },
  { icon: BarChart3, title: "Financeiro", text: "A receber, a pagar e baixa de pagamento." },
  { icon: Globe2, title: "Vitrine online", text: "Página da loja gerada do estoque real, pronta para compartilhar." },
  { icon: Users, title: "Equipe", text: "Proprietário, gerente, vendedor e caixa, cada um no seu acesso." },
];

export default async function ReferralLandingPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const affiliate = await findActiveAffiliateByCode(code);
  if (!affiliate) notFound();

  const signupHref = referralSignupHref(affiliate.code);
  const firstName = affiliate.name.split(" ")[0];
  const entryPlan = PUBLIC_PLANS[0];

  return (
    <main className="relative min-h-screen overflow-hidden bg-ink-950 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-64 h-[720px] bg-[radial-gradient(60%_60%_at_70%_20%,rgba(192,16,32,0.45),transparent_70%)]"
      />

      {/* Barra clara sobre o fundo escuro: o logo tem letra preta e some no quase-preto. */}
      <header className="relative px-3 pt-3 sm:px-5 sm:pt-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between rounded-2xl border border-white/40 bg-ink-50/95 px-4 py-2.5 shadow-lg shadow-black/40 backdrop-blur">
          <Brand className="h-9" priority />
          <nav className="flex items-center gap-2">
            <Link
              href="/ajuda/planos"
              className="hidden px-3 text-sm font-medium text-ink-600 hover:text-ink-900 sm:inline"
            >
              Planos
            </Link>
            <Link href={signupHref} className="btn btn-primary">
              Criar minha loja
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative mx-auto max-w-6xl px-6 py-14 sm:py-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <span className="badge border border-brand-500/30 bg-brand-500/10 text-brand-200">
              <BadgeCheck className="size-3.5" />
              Indicação de {firstName}
            </span>
            <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
              Sua loja inteira em{" "}
              <span className="bg-gradient-to-r from-brand-400 via-brand-300 to-brand-500 bg-clip-text text-transparent">
                um só sistema
              </span>
              .
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-300">
              Estoque, caixa, financeiro e vitrine online trabalhando com os
              mesmos dados. Você cadastra o produto uma vez e ele aparece no
              balcão, no relatório e na página da loja.
            </p>

            <ul className="mt-6 space-y-2.5 text-sm text-ink-200">
              {[
                "14 dias grátis, sem cartão de crédito",
                "Funciona no celular, no tablet e no computador",
                "Vitrine pública inclusa, sem custo extra",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand-300" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href={signupHref}
                className="btn btn-primary px-6 py-3 text-base shadow-lg shadow-brand-900/40"
              >
                Começar meu teste grátis
                <ArrowRight className="size-4" />
              </Link>
              <span className="text-sm text-ink-400">
                A partir de {formatBRL(entryPlan.monthlyCents)}/mês
              </span>
            </div>
          </div>

          <div className="relative">
            <div
              aria-hidden
              className="absolute -inset-4 rounded-[2rem] bg-brand-600/20 blur-2xl"
            />
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
              <Image
                src="/hero-loja.jpg"
                alt="Vendedora apresenta um casaco a uma cliente sorridente em uma loja de roupas"
                fill
                priority
                sizes="(min-width: 1024px) 520px, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">
            O que você resolve no primeiro dia
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((module) => (
              <article
                key={module.title}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
              >
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
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

      <section className="relative mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { step: "1", title: "Crie a conta", text: "Nome da loja, e-mail e pronto. Sem cartão." },
            { step: "2", title: "Cadastre o estoque", text: "Produtos, preços e fotos levam minutos." },
            { step: "3", title: "Venda e divulgue", text: "PDV no balcão e vitrine no ar no mesmo dia." },
          ].map((item) => (
            <div key={item.step} className="relative">
              <span className="flex size-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold">
                {item.step}
              </span>
              <h3 className="mt-3 font-semibold text-white">{item.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-300">
                {item.text}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-14 overflow-hidden rounded-3xl border border-brand-500/30 bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 px-6 py-10 shadow-2xl sm:px-10">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-brand-100">
                <ShieldCheck className="size-4" />
                Indicação de {affiliate.name}
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                Comece hoje e teste por 14 dias.
              </h2>
              <p className="mt-2 max-w-xl text-sm text-brand-50">
                Sem instalação, sem fidelidade. Se não servir, você encerra sem
                custo.
              </p>
            </div>
            <Link
              href={signupHref}
              className="btn bg-white px-6 py-3 text-brand-700 shadow-lg hover:bg-brand-50"
            >
              Criar minha loja agora
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter tone="dark" />
    </main>
  );
}
