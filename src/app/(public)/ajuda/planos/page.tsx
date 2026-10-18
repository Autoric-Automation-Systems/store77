import type { Metadata } from "next";
import Link from "next/link";
import { Check, CircleHelp, Minus } from "lucide-react";
import {
  ADDONS,
  ANNUAL_DISCOUNT_BP,
  FULL_ACCESS_GRACE_DAYS,
  POS_GRACE_DAYS,
  PUBLIC_PLANS,
  TRIAL_DAYS,
} from "@/lib/billing/plans";
import { formatBRL } from "@/lib/format";
import { COMPANY, PRODUCT } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Planos e cobrança",
  description:
    "Como o Store77 cobra, o que muda entre Essencial, Loja, Equipe, Rede e Corporativo, adicionais, teste de 14 dias e regras de atraso e cancelamento.",
};

type Feature = {
  label: string;
  hint?: string;
  values: (string | boolean)[];
};

// Só entra aqui o que muda de fato entre os degraus. Módulo, caixa por turno e
// papéis existem em todos os planos — o que o plano limita é gente e volume.
const FEATURES: Feature[] = [
  {
    label: "Estoque, PDV, caixa e financeiro",
    values: [true, true, true, true, true],
  },
  {
    label: "Vitrine online e pedido pelo WhatsApp",
    values: [true, true, true, true, true],
  },
  {
    label: "Papéis de proprietário, gerente, vendedor e caixa",
    hint: "Igual em todos; o Essencial tem um único login.",
    values: [true, true, true, true, true],
  },
  {
    label: "Suporte",
    values: [
      "E-mail",
      "E-mail prioritário",
      "Prioritário",
      "Prioritário + canal",
      "Onboarding assistido",
    ],
  },
];

const AUDIENCE = [
  "Quem vende sozinho, no balcão ou pelo WhatsApp",
  "Você e mais duas pessoas, inclusive em turnos",
  "Vários caixas no mesmo dia e um gerente",
  "Duas ou três lojas sob a mesma gestão",
  "Redes com 50 ou mais funcionários",
];

function cell(value: string | boolean) {
  if (typeof value === "string") return value;
  return value ? (
    <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
      <Check className="size-4" />
      <span className="sr-only">Incluído</span>
    </span>
  ) : (
    <span className="inline-flex items-center text-ink-300">
      <Minus className="size-4" />
      <span className="sr-only">Não incluído</span>
    </span>
  );
}

export default function PlanosPage() {
  const annualDiscount = ANNUAL_DISCOUNT_BP / 100;
  const top = PUBLIC_PLANS[PUBLIC_PLANS.length - 1];
  const essencial = PUBLIC_PLANS[0];
  const loja = PUBLIC_PLANS[1];
  const equipe = PUBLIC_PLANS[2];
  const rede = PUBLIC_PLANS[3];

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
        <CircleHelp className="size-4" />
        Central de ajuda
      </p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-ink-900 sm:text-4xl">
        Planos e cobrança
      </h1>
      <p className="mt-3 text-base text-ink-600">
        A cobrança é por loja, mensal ou anual, e o valor é formado por plano mais
        adicionais. Esta página explica o que muda de um plano para o outro, o que
        conta como usuário e como venda, e o que acontece quando o pagamento
        atrasa.
      </p>

      <nav className="mt-8 flex flex-wrap gap-2">
        {[
          { href: "#comparativo", label: "Comparativo" },
          { href: "#diferencas", label: "O que muda" },
          { href: "#teste", label: "Teste de 14 dias" },
          { href: "#adicionais", label: "Adicionais" },
          { href: "#cobranca", label: "Cobrança" },
          { href: "#atraso", label: "Atraso" },
          { href: "#mudanca", label: "Mudança e cancelamento" },
          { href: "#afiliados", label: "Afiliados" },
        ].map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="rounded-full bg-ink-100 px-3.5 py-1.5 text-sm font-medium text-ink-700 transition hover:bg-ink-200 hover:text-ink-900"
          >
            {item.label}
          </a>
        ))}
      </nav>

      <section id="comparativo" className="mt-12 scroll-mt-20">
        <h2 className="text-xl font-bold tracking-tight text-ink-900">
          Comparativo dos planos
        </h2>
        <p className="mt-2 text-sm text-ink-600">
          Todos os planos têm estoque, PDV, caixa, financeiro e vitrine. O que muda
          é a capacidade (usuários, vendas e lojas) e os recursos de gestão para
          equipes maiores.
        </p>
        <p className="mt-2 text-sm text-ink-600">
          <strong className="text-ink-800">Usuários são limite firme:</strong> sem
          assento livre, o convite é bloqueado.{" "}
          <strong className="text-ink-800">Vendas são faixa de uso:</strong> ao
          chegar a 80% do limite o painel avisa e, ao passar, as vendas continuam
          registrando — o sistema sugere um pacote extra em vez de travar o caixa.
        </p>

        <div className="mt-5 overflow-x-auto rounded-xl border border-ink-200">
          <table className="min-w-[860px] divide-y divide-ink-200 text-sm">
            <thead className="bg-ink-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Plano
                </th>
                {PUBLIC_PLANS.map((plan) => (
                  <th key={plan.code} className="px-4 py-3 text-left">
                    <span className="block font-bold text-ink-900">{plan.name}</span>
                    <span className="mt-0.5 block text-xs font-normal text-ink-500">
                      {formatBRL(plan.monthlyCents)}/mês
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              <tr>
                <th scope="row" className="px-4 py-3 text-left font-medium text-ink-700">
                  Preço anual
                  <span className="block text-xs font-normal text-ink-500">
                    {annualDiscount}% de desconto
                  </span>
                </th>
                {PUBLIC_PLANS.map((plan) => (
                  <td key={plan.code} className="px-4 py-3 text-ink-700">
                    {formatBRL(plan.annualCents)}
                    <span className="block text-xs text-ink-500">
                      equivale a {formatBRL(Math.round(plan.annualCents / 12))}/mês
                    </span>
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row" className="px-4 py-3 text-left font-medium text-ink-700">
                  Usuários ativos
                  <span className="block text-xs font-normal text-ink-500">
                    Dono, gerente, vendedor e caixa; cliente não conta
                  </span>
                </th>
                {PUBLIC_PLANS.map((plan) => (
                  <td key={plan.code} className="px-4 py-3 text-ink-700">
                    {plan.includedSeats}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row" className="px-4 py-3 text-left font-medium text-ink-700">
                  Custo por usuário
                  <span className="block text-xs font-normal text-ink-500">
                    Cai a cada degrau
                  </span>
                </th>
                {PUBLIC_PLANS.map((plan) => (
                  <td key={plan.code} className="px-4 py-3 text-ink-700">
                    {formatBRL(Math.round(plan.monthlyCents / plan.includedSeats))}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row" className="px-4 py-3 text-left font-medium text-ink-700">
                  Vendas por mês
                </th>
                {PUBLIC_PLANS.map((plan) => (
                  <td key={plan.code} className="px-4 py-3 text-ink-700">
                    {plan.includedSalesPerMonth.toLocaleString("pt-BR")}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row" className="px-4 py-3 text-left font-medium text-ink-700">
                  Lojas incluídas
                  <span className="block text-xs font-normal text-ink-500">
                    Extras habilitadas pelo suporte
                  </span>
                </th>
                {PUBLIC_PLANS.map((plan) => (
                  <td key={plan.code} className="px-4 py-3 text-ink-700">
                    {plan.includedStores}
                  </td>
                ))}
              </tr>
              {FEATURES.map((feature) => (
                <tr key={feature.label}>
                  <th scope="row" className="px-4 py-3 text-left font-medium text-ink-700">
                    {feature.label}
                    {feature.hint ? (
                      <span className="block text-xs font-normal text-ink-500">
                        {feature.hint}
                      </span>
                    ) : null}
                  </th>
                  {feature.values.map((value, index) => (
                    <td key={index} className="px-4 py-3 text-ink-700">
                      {cell(value)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <th scope="row" className="px-4 py-3 text-left font-medium text-ink-700">
                  Indicado para
                </th>
                {AUDIENCE.map((text) => (
                  <td key={text} className="px-4 py-3 align-top text-xs text-ink-600">
                    {text}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="diferencas" className="mt-12 scroll-mt-20">
        <h2 className="text-xl font-bold tracking-tight text-ink-900">
          O que muda de um plano para o outro
        </h2>
        <p className="mt-2 text-sm text-ink-600">
          Cada degrau acrescenta algo concreto. A lista abaixo é cumulativa: o
          plano seguinte inclui tudo do anterior.
        </p>

        <div className="mt-5 space-y-3">
          {[
            {
              title: `Essencial · ${formatBRL(essencial.monthlyCents)}/mês`,
              text: `A porta de entrada: ${essencial.includedSeats} usuário ativo, o próprio dono, e ${essencial.includedSalesPerMonth} vendas por mês — cerca de 20 por dia útil. Tem todos os módulos: estoque com foto, PDV com sessão de caixa, financeiro, clientes e vitrine. Quem tem um ajudante adiciona um assento por ${formatBRL(ADDONS.seat.monthlyCents)}/mês.`,
            },
            {
              title: `Loja · ${formatBRL(loja.monthlyCents)}/mês`,
              text: `Trio completo: ${loja.includedSeats} usuários e ${loja.includedSalesPerMonth.toLocaleString("pt-BR")} vendas por mês. É o plano da loja de bairro com o dono e mais duas pessoas, inclusive em turnos diferentes, com suporte prioritário.`,
            },
            {
              title: `Equipe · ${formatBRL(equipe.monthlyCents)}/mês`,
              text: `${equipe.includedSeats} usuários e ${equipe.includedSalesPerMonth.toLocaleString("pt-BR")} vendas por mês. Atende vários operadores no mesmo dia — com caixas, vendedores e gerente — e inclui apoio do suporte para configurar papéis e turnos.`,
            },
            {
              title: `Rede · ${formatBRL(rede.monthlyCents)}/mês`,
              text: `Inclui ${rede.includedStores} lojas, ${rede.includedSeats} usuários e ${rede.includedSalesPerMonth.toLocaleString("pt-BR")} vendas por mês. Para duas ou três unidades sob a mesma gestão. Cada unidade é habilitada pelo suporte durante a implantação, e a visão consolidada acompanha o rollout.`,
            },
            {
              title: `Corporativo · ${formatBRL(top.monthlyCents)}/mês`,
              text: `Inclui ${top.includedStores} lojas, ${top.includedSeats} usuários e ${top.includedSalesPerMonth.toLocaleString("pt-BR")} vendas por mês, com onboarding assistido e canal direto de suporte. É o plano para redes com 50 ou mais funcionários.`,
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-ink-200 bg-white px-5 py-4"
            >
              <p className="font-semibold text-ink-900">{item.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-600">{item.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-ink-200 bg-ink-50 px-5 py-4">
          <p className="text-sm font-semibold text-ink-900">
            Igual em todos os planos
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-700">
            Estoque com fotos e código de barras, PDV, abertura e fechamento de
            caixa por turno, sangria e suprimento, financeiro, clientes, vitrine
            automática e os quatro papéis (proprietário, gerente, vendedor e
            caixa). Nenhum módulo fica de fora por causa do plano — o que muda é
            quantas pessoas entram e quanto a loja vende.
          </p>
        </div>

        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-semibold text-ink-900">Sobre multi-loja</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-700">
            As unidades extras do Rede e do Corporativo entram no contrato e são
            habilitadas pelo suporte na implantação. A visão consolidada entre
            unidades está em rollout: enquanto não estiver ativa na sua conta, o
            suporte acompanha a operação e combina a data de liberação.
          </p>
        </div>

        <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50 px-5 py-4">
          <p className="text-sm font-semibold text-ink-900">
            Acima do {top.name}? Fale com o suporte.
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-700">
            Redes maiores que {top.includedStores} lojas ou {top.includedSeats}{" "}
            usuários recebem proposta sob medida, com adicionais negociados. O teto
            existe para manter o preço previsível e não cobrar de quem não usa.
          </p>
        </div>
      </section>

      <section id="teste" className="mt-12 scroll-mt-20">
        <h2 className="text-xl font-bold tracking-tight text-ink-900">
          Teste de {TRIAL_DAYS} dias, sem cartão
        </h2>
        <div className="mt-3 space-y-2 text-sm leading-relaxed text-ink-600">
          <p>
            Toda loja nasce com {TRIAL_DAYS} dias de acesso ao plano Loja, sem
            pedir cartão e sem cobrança automática no fim. O objetivo é que você
            cadastre o estoque, abra o caixa e venda de verdade antes de decidir.
          </p>
          <p>
            Durante o teste, usuários, vendas e lojas seguem os limites do plano
            Loja: {loja.includedSeats} usuários ativos,{" "}
            {loja.includedSalesPerMonth.toLocaleString("pt-BR")} vendas por mês e{" "}
            {loja.includedStores} loja. É de propósito: dá para testar com o dono e
            mais duas pessoas, sem começar no plano mais apertado. Ao final, a loja
            continua acessível, mas em modo somente leitura, até você escolher um
            plano. Nada é apagado e o histórico é preservado.
          </p>
          <p>
            Não existe cobrança retroativa do período de teste. Se você contratar
            um plano anual, o primeiro ciclo começa na data da contratação.
          </p>
        </div>
      </section>

      <section id="adicionais" className="mt-12 scroll-mt-20">
        <h2 className="text-xl font-bold tracking-tight text-ink-900">Adicionais</h2>
        <p className="mt-2 text-sm text-ink-600">
          Você não precisa trocar de plano para crescer um pouco. Os adicionais
          entram no mesmo ciclo de cobrança e podem ser ajustados a qualquer
          momento, com efeito no próximo vencimento.
        </p>
        <div className="mt-5 overflow-hidden rounded-xl border border-ink-200">
          <table className="min-w-full divide-y divide-ink-200 text-sm">
            <thead className="bg-ink-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Adicional
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Preço
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Observação
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              <tr>
                <td className="px-4 py-3 font-medium text-ink-800">
                  {ADDONS.seat.label}
                </td>
                <td className="px-4 py-3 text-ink-700">
                  {formatBRL(ADDONS.seat.monthlyCents)}/mês
                </td>
                <td className="px-4 py-3 text-ink-600">
                  Cada pessoa ativa que opera a loja. Cliente da vitrine não conta.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-ink-800">
                  {ADDONS.store.label}
                </td>
                <td className="px-4 py-3 text-ink-700">
                  {formatBRL(ADDONS.store.monthlyCents)}/mês
                </td>
                <td className="px-4 py-3 text-ink-600">
                  Loja adicional além das incluídas no plano.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-ink-800">
                  {ADDONS.salesPack.label}
                </td>
                <td className="px-4 py-3 text-ink-700">
                  {formatBRL(ADDONS.salesPack.monthlyCents)}/mês
                </td>
                <td className="px-4 py-3 text-ink-600">
                  Soma {ADDONS.salesPack.sales.toLocaleString("pt-BR")} vendas por
                  mês ao limite do plano. Venda cancelada não conta. Não bloqueia
                  o PDV: o pacote ajusta a faixa e o aviso de uso.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="cobranca" className="mt-12 scroll-mt-20">
        <h2 className="text-xl font-bold tracking-tight text-ink-900">
          Como a cobrança funciona
        </h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-600">
          <li>
            <strong className="text-ink-800">Por loja, não por pessoa.</strong> O
            plano é da loja; os usuários entram dentro do limite de assentos.
          </li>
          <li>
            <strong className="text-ink-800">Uso, não bloqueio.</strong> O limite de
            vendas existe para calibrar o preço, não para parar a loja. Passar do
            limite não impede vender; gera aviso e a recomendação de um pacote ou
            de um plano maior.
          </li>
          <li>
            <strong className="text-ink-800">Ciclo mensal ou anual.</strong> O anual
            sai com {annualDiscount}% de desconto e é cobrado uma vez, no início do
            ciclo.
          </li>
          <li>
            <strong className="text-ink-800">Meios de pagamento.</strong> Pix,
            boleto e cartão, processados pelo Asaas. O cartão renova sozinho; Pix e
            boleto geram uma fatura por ciclo.
          </li>
          <li>
            <strong className="text-ink-800">Fatura.</strong> Cada cobrança gera uma
            fatura com o valor efetivamente cobrado. Mudanças de preço posteriores
            não alteram faturas já emitidas.
          </li>
          <li>
            <strong className="text-ink-800">Nota fiscal.</strong> O {PRODUCT.name}{" "}
            não emite nota fiscal de serviço; o documento é solicitado ao suporte e
            emitido pela empresa responsável, com os dados da loja.
          </li>
        </ul>
      </section>

      <section id="atraso" className="mt-12 scroll-mt-20">
        <h2 className="text-xl font-bold tracking-tight text-ink-900">
          Atraso, restrição e suspensão
        </h2>
        <p className="mt-2 text-sm text-ink-600">
          A regra é simples e não interrompe a operação de surpresa: primeiro avisa,
          depois restringe o que é de gestão e só no fim para o PDV.
        </p>
        <ol className="mt-5 space-y-4">
          {[
            {
              title: `Até ${FULL_ACCESS_GRACE_DAYS} dias de atraso`,
              text: "Acesso completo. Um aviso aparece no topo do painel com o valor e o vencimento. Nada muda na operação.",
            },
            {
              title: `De ${FULL_ACCESS_GRACE_DAYS} a ${POS_GRACE_DAYS} dias`,
              text: "Modo restrito: PDV, caixa e vitrine continuam funcionando para você não parar de vender. Ficam bloqueados cadastro e edição de produtos, financeiro, equipe, configuração da vitrine e a contratação de novos adicionais. Os dados continuam visíveis e exportáveis.",
            },
            {
              title: `Depois de ${POS_GRACE_DAYS} dias`,
              text: "Loja suspensa: o painel entra em modo somente leitura e a vitrine sai do ar. Nada é apagado. Ao regularizar, o acesso volta imediatamente, sem taxa de reativação.",
            },
          ].map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                {index + 1}
              </span>
              <div>
                <p className="font-semibold text-ink-900">{step.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-ink-600">
                  {step.text}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm leading-relaxed text-ink-600">
          Os dados continuam legíveis em qualquer estado, e a exportação em formato
          aberto pode ser pedida ao suporte. O bloqueio nunca apaga estoque, vendas
          ou histórico.
        </p>
      </section>

      <section id="mudanca" className="mt-12 scroll-mt-20">
        <h2 className="text-xl font-bold tracking-tight text-ink-900">
          Mudança de plano, adicionais e cancelamento
        </h2>
        <div className="mt-3 space-y-2 text-sm leading-relaxed text-ink-600">
          <p>
            <strong className="text-ink-800">Trocar de plano</strong> vale a partir
            do próximo vencimento. Não há cobrança proporcional nem crédito
            retroativo: você usa o plano atual até o fim do ciclo já pago e o novo
            valor entra na fatura seguinte. Para subir na hora, contrate o plano
            novo e o suporte ajusta o ciclo manualmente.
          </p>
          <p>
            <strong className="text-ink-800">Adicionais</strong> seguem a mesma
            regra: o valor novo entra no próximo ciclo. Reduzir um adicional nunca
            remove dados; apenas impede novos cadastros acima do limite.
          </p>
          <p>
            <strong className="text-ink-800">Plano menor que a equipe</strong> não
            é aceito: o sistema só deixa escolher um plano que comporte os logins
            ativos mais os assentos extras. Se o teste foi feito no Loja e você
            quer ficar no Essencial, desative os logins excedentes antes de trocar —
            o histórico de quem saiu permanece.
          </p>
          <p>
            <strong className="text-ink-800">Cancelar</strong> pode ser feito em
            Assinatura, pelo proprietário. O acesso continua até o fim do período
            pago e não há multa. Depois disso, a loja fica em modo somente leitura,
            e os dados podem ser exportados sob solicitação.
          </p>
          <p>
            <strong className="text-ink-800">Reajuste</strong> é comunicado com pelo
            menos 30 dias de antecedência e vale a partir do ciclo seguinte. O valor
            de cada fatura é registrado no momento da emissão, então o histórico não
            muda quando a tabela muda.
          </p>
          <p>
            <strong className="text-ink-800">Cortesia e legado</strong> são
            concedidos pelo suporte, com motivo e validade registrados. Lojas
            criadas antes da cobrança recebem 90 dias de cortesia de migração; ao
            fim, seguem a regra normal de contratação.
          </p>
        </div>
      </section>

      <section id="afiliados" className="mt-12 scroll-mt-20">
        <h2 className="text-xl font-bold tracking-tight text-ink-900">
          Programa de afiliados
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          Quem indica lojista recebe comissão recorrente sobre a assinatura
          enquanto ela estiver ativa, por 12 meses. As regras completas, os
          percentuais e o material de divulgação estão em{" "}
          <Link href="/afiliados" className="font-medium text-brand-700 underline">
            Programa de afiliados
          </Link>
          .
        </p>
      </section>

      <section className="mt-12 rounded-2xl bg-ink-50 px-6 py-8">
        <h2 className="text-lg font-bold tracking-tight text-ink-900">
          Dúvidas sobre o seu caso
        </h2>
        <p className="mt-2 text-sm text-ink-600">
          Fale com o suporte em <strong>{COMPANY.contactEmail}</strong> informando o
          nome da loja e o plano atual. Para consultar preços e contratar, abra{" "}
          <Link href="/assinatura" className="font-medium text-brand-700 underline">
            Assinatura
          </Link>{" "}
          no painel.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/ajuda" className="btn btn-secondary">
            Voltar à ajuda
          </Link>
          <Link href="/termos" className="btn btn-secondary">
            Termos de Uso
          </Link>
        </div>
      </section>
    </div>
  );
}
