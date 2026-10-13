import Link from "next/link";
import {
  BarChart3,
  Boxes,
  CreditCard,
  Globe2,
  ScanBarcode,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Brand } from "@/components/brand";

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
    <main className="min-h-screen bg-white">
      <header className="border-b border-ink-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Brand className="h-10" priority />
          <nav className="flex items-center gap-2">
            <Link href="/login" className="btn btn-ghost">
              Entrar
            </Link>
            <Link href="/cadastro" className="btn btn-primary">
              Criar minha loja
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <div className="max-w-3xl">
          <span className="badge bg-brand-50 text-brand-700">
            <ShieldCheck className="size-3.5" />
            Comece pelo controle de estoque
          </span>
          <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-ink-900 sm:text-5xl">
            Um sistema para a loja física e para a loja online.
          </h1>
          <p className="mt-5 text-lg text-ink-600">
            Cadastre o estoque uma única vez e ele alimenta o caixa, o
            financeiro e a vitrine pública da sua loja. Sem planilha paralela,
            sem retrabalho.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/cadastro" className="btn btn-primary px-6 py-3">
              Começar agora
            </Link>
            <Link href="/login" className="btn btn-secondary px-6 py-3">
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-ink-200 bg-ink-50">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((module) => (
            <article key={module.title} className="card card-pad">
              <module.icon className="size-6 text-brand-600" />
              <h2 className="mt-4 text-base font-semibold text-ink-900">
                {module.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                {module.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-sm text-ink-500">
        Store77 · Next.js + Neon + Vercel
      </footer>
    </main>
  );
}
