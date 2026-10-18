import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  HandCoins,
  Link2,
  Mail,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { COMMISSION_HOLD_DAYS, DEFAULT_COMMISSION_BP, DEFAULT_COMMISSION_MONTHS } from "@/lib/billing/plans";
import { COMPANY, PRODUCT } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Programa de afiliados",
  description:
    "Indique o Store77 e receba comissão recorrente sobre cada assinatura paga, por 12 meses. Regras, percentuais e como se cadastrar.",
};

const STEPS = [
  {
    icon: Link2,
    title: "Receba seu link e código",
    text: "O cadastro é feito pelo suporte, com seus dados e a forma de pagamento. Você recebe um código e um link de indicação para divulgar.",
  },
  {
    icon: BadgeCheck,
    title: "A loja se cadastra e testa",
    text: "A loja indicada cria a conta, usa os 14 dias de teste e escolhe um plano. O vínculo é registrado no primeiro pagamento confirmado.",
  },
  {
    icon: HandCoins,
    title: "A comissão é apurada por fatura",
    text: "A cada fatura paga pela loja indicada, a comissão é calculada sobre o valor efetivamente pago, já com descontos e adicionais.",
  },
  {
    icon: Wallet,
    title: "Receba por Pix",
    text: "A comissão fica disponível depois do prazo de segurança e é paga por Pix no mês seguinte, com extrato enviado pelo suporte.",
  },
];

export default function AfiliadosPage() {
  const rate = DEFAULT_COMMISSION_BP / 100;

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
        <HandCoins className="size-4" />
        Programa de afiliados
      </p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-ink-900 sm:text-4xl">
        Indique o {PRODUCT.name} e ganhe todo mês
      </h1>
      <p className="mt-3 max-w-2xl text-base text-ink-600">
        A comissão é recorrente: ela não depende de uma única venda. Enquanto a
        loja indicada estiver pagando a assinatura, você recebe um percentual sobre
        cada fatura, por até {DEFAULT_COMMISSION_MONTHS} meses.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-ink-200 bg-white px-5 py-5">
          <p className="text-3xl font-black tracking-tight text-brand-700">{rate}%</p>
          <p className="mt-1 text-sm font-medium text-ink-800">por fatura paga</p>
          <p className="mt-1 text-xs text-ink-500">
            Sobre o valor efetivamente cobrado, sem teto de ganho.
          </p>
        </div>
        <div className="rounded-2xl border border-ink-200 bg-white px-5 py-5">
          <p className="text-3xl font-black tracking-tight text-brand-700">
            {DEFAULT_COMMISSION_MONTHS}
          </p>
          <p className="mt-1 text-sm font-medium text-ink-800">meses por indicação</p>
          <p className="mt-1 text-xs text-ink-500">
            Contados a partir da primeira fatura paga pela loja.
          </p>
        </div>
        <div className="rounded-2xl border border-ink-200 bg-white px-5 py-5">
          <p className="text-3xl font-black tracking-tight text-brand-700">
            {COMMISSION_HOLD_DAYS} dias
          </p>
          <p className="mt-1 text-sm font-medium text-ink-800">de segurança</p>
          <p className="mt-1 text-xs text-ink-500">
            Protege estornos e cancelamentos antes do repasse.
          </p>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-bold tracking-tight text-ink-900">
          Como funciona
        </h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-2">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="rounded-xl border border-ink-200 bg-white px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                  <step.icon className="size-4" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                  Passo {index + 1}
                </span>
              </div>
              <p className="mt-3 font-semibold text-ink-900">{step.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-600">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-bold tracking-tight text-ink-900">
          Regras da comissão
        </h2>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-ink-600">
          <div className="rounded-xl border border-ink-200 bg-white px-5 py-4">
            <p className="font-semibold text-ink-900">Base de cálculo</p>
            <p className="mt-1">
              A comissão incide sobre o valor pago em cada fatura, incluindo o plano
              e os adicionais. Se a loja usar um cupom ou desconto promocional, a
              comissão acompanha o valor menor. Impostos destacados na fatura não
              entram na base.
            </p>
          </div>
          <div className="rounded-xl border border-ink-200 bg-white px-5 py-4">
            <p className="font-semibold text-ink-900">Quem não gera comissão</p>
            <p className="mt-1">
              Lojas em cortesia, contas internas ou de teste, a sua própria loja e
              lojas que já tinham vínculo com outro afiliado. Cada loja tem um único
              afiliado de origem: vale a primeira indicação registrada.
            </p>
          </div>
          <div className="rounded-xl border border-ink-200 bg-white px-5 py-4">
            <p className="font-semibold text-ink-900">Janela de atribuição</p>
            <p className="mt-1">
              A indicação vale quando a loja se cadastra pelo seu link ou informa o
              seu código e contrata um plano em até 90 dias. Depois desse prazo, é
              necessário um novo contato para registrar o vínculo.
            </p>
          </div>
          <div className="rounded-xl border border-ink-200 bg-white px-5 py-4">
            <p className="font-semibold text-ink-900">Estornos e atrasos</p>
            <p className="mt-1">
              Fatura estornada, cancelada ou paga com chargeback não gera comissão.
              Se o estorno acontecer depois do repasse, o valor é descontado da
              próxima apuração. Assinatura suspensa por falta de pagamento não gera
              comissão enquanto não for regularizada.
            </p>
          </div>
          <div className="rounded-xl border border-ink-200 bg-white px-5 py-4">
            <p className="font-semibold text-ink-900">Pagamento</p>
            <p className="mt-1">
              O repasse é feito por Pix, até o dia 10 do mês seguinte ao fechamento,
              quando o saldo disponível for de pelo menos R$ 50,00. Saldos menores
              acumulam para o mês seguinte. O suporte envia um extrato com as faturas
              que geraram comissão e o valor de cada uma.
            </p>
          </div>
          <div className="rounded-xl border border-ink-200 bg-white px-5 py-4">
            <p className="font-semibold text-ink-900">Divulgação</p>
            <p className="mt-1">
              Pode divulgar em site, redes sociais, vídeos e listas, desde que
              identifique o conteúdo como indicação e não prometa resultados que o
              produto não entrega. São proibidos anúncios com a marca {PRODUCT.name}{" "}
              que simulem o site oficial, uso de spam e autocompra para gerar
              comissão.
            </p>
          </div>
          <div className="rounded-xl border border-ink-200 bg-white px-5 py-4">
            <p className="font-semibold text-ink-900">Parceiros</p>
            <p className="mt-1">
              Quem traz volume recorrente pode negociar condições específicas, com
              percentual maior e prazo estendido. As condições valem só para o
              parceiro e ficam registradas no cadastro dele.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-bold tracking-tight text-ink-900">
          Como se cadastrar
        </h2>
        <div className="mt-4 rounded-2xl border border-brand-200 bg-brand-50 px-6 py-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-700" />
            <div className="text-sm leading-relaxed text-ink-700">
              <p className="font-semibold text-ink-900">
                O credenciamento é feito pelo suporte
              </p>
              <p className="mt-1">
                Envie um e-mail com nome, CPF ou CNPJ, chave Pix e uma breve
                descrição de como pretende divulgar. A análise leva até 3 dias
                úteis. Contas aprovadas recebem o código e o link.
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <a
              href={`mailto:${COMPANY.contactEmail}?subject=Programa%20de%20afiliados%20Store77`}
              className="btn btn-primary"
            >
              <Mail className="size-4" />
              Quero ser afiliado
            </a>
            <Link href="/ajuda/planos" className="btn btn-secondary">
              Ver planos e preços
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-12 rounded-2xl bg-ink-50 px-6 py-8">
        <h2 className="text-lg font-bold tracking-tight text-ink-900">
          Transparência
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          O programa é operado diretamente por {COMPANY.legalName}. A comissão é
          calculada sobre a receita líquida recebida e o extrato é enviado para
          conferência. Em caso de divergência, o suporte revisa a apuração
          antes do pagamento. O programa pode ser encerrado ou ter regras alteradas
          com aviso prévio de 30 dias; indicações já convertidas mantêm a comissão
          pelo prazo original.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink-600">
          Dúvidas sobre valores, prazos ou regras:{" "}
          <strong>{COMPANY.contactEmail}</strong>.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/termos" className="btn btn-secondary">
            Termos de Uso
          </Link>
          <Link href="/ajuda" className="btn btn-secondary">
            Central de ajuda
          </Link>
        </div>
      </section>
    </div>
  );
}
