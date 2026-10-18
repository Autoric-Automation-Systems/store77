import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  Boxes,
  Check,
  CircleHelp,
  Globe2,
  Minus,
  ShoppingCart,
  Users,
} from "lucide-react";
import { COMPANY, PRODUCT, PRODUCT_HOST } from "@/lib/legal";
import { PUBLIC_PLANS } from "@/lib/billing/plans";
import { formatBRL } from "@/lib/format";

export const metadata: Metadata = {
  title: "Ajuda",
  description:
    "Guia rápido do Store77: primeiros passos, planos e cobrança, contas e acesso, módulos, papéis e perguntas frequentes.",
};

const FIRST_STEPS = [
  {
    title: "Crie os tipos e nichos",
    text: "Em Estoque → Tipos e nichos, cadastre como você organiza os produtos. É isso que separa os carrosséis da vitrine.",
    href: "/estoque/categorias",
    cta: "Abrir Tipos e nichos",
  },
  {
    title: "Cadastre os produtos",
    text: "Em Estoque → Novo produto, informe código, descrição, preço, custo, quantidade e o endereço na prateleira. A primeira foto vira a capa da vitrine.",
    href: "/estoque/novo",
    cta: "Abrir Novo produto",
  },
  {
    title: "Mantenha o saldo em dia",
    text: "Use Movimentações para entradas de compra, perdas e inventário. Toda alteração fica no histórico com o saldo resultante.",
    href: "/estoque/movimentacoes",
    cta: "Abrir Movimentações",
  },
  {
    title: "Abra o caixa e venda",
    text: "Abra uma sessão em Sessões de caixa e registre as vendas no PDV. Sem sessão aberta, a venda é registrada mas o dinheiro não entra na conferência do turno.",
    href: "/caixa/sessoes",
    cta: "Abrir Sessões de caixa",
  },
  {
    title: "Configure a vitrine e divulgue",
    text: "Em Vitrine online, escolha o link, suba a logo, escreva o hero e defina a paleta. A página já está no ar: basta compartilhar o endereço com seus clientes.",
    href: "/vitrine",
    cta: "Abrir Vitrine online",
  },
];

const ACCESS_TOPICS = [
  {
    title: "Entrar pela primeira vez",
    text: "O cadastro da loja e o convite da equipe não pedem senha na hora: mandam um link para o seu e-mail. Abra o link, crie a senha e você entra direto no painel. Criar a senha por esse link é o que confirma que o endereço é seu — não existe uma etapa separada de confirmação. O link vale 48 horas e só pode ser usado uma vez.",
  },
  {
    title: "Conferir a senha antes de salvar",
    text: "Todo campo de senha tem um ícone de olho no canto direito. Clique para mostrar o que digitou, clique de novo para esconder. Ajuda a pegar erro de digitação no celular, onde o teclado erra com frequência. O botão só muda a exibição na tela: não guarda, não envia e não altera a senha.",
  },
  {
    title: "Esqueci minha senha",
    text: "Na tela de login, clique em “Esqueci minha senha” e informe o e-mail da conta. O link chega em instantes e vale 1 hora. Ao salvar a nova senha, você entra direto no painel e o link deixa de funcionar.",
  },
  {
    title: "O link do convite não chegou",
    text: "Use “Reenviar confirmação” na tela de login, com o mesmo e-mail do convite. O link novo vale 48 horas e substitui o anterior. Esse formulário só envia e-mail para contas que ainda não têm senha ou não confirmaram o endereço; se a conta já está ativa, o caminho é “Esqueci minha senha”.",
  },
  {
    title: "Um pedido por minuto",
    text: "Para não encher a caixa de entrada, o sistema gera um link novo apenas 1 minuto depois do anterior. Se você pedir duas vezes seguidas, o segundo pedido não gera e-mail: use o link que já chegou.",
  },
  {
    title: "A resposta é sempre a mesma",
    text: "Depois do pedido, a mensagem é sempre “se este e-mail estiver cadastrado, você receberá um link”, mesmo quando o endereço não existe na base. Isso é proteção: sem essa resposta única, qualquer pessoa poderia testar e-mails para descobrir quem tem conta. O texto neutro não significa que o envio falhou.",
  },
  {
    title: "Trocar a senha com a conta aberta",
    text: "Em Equipe → Minha senha, informe a senha atual e defina a nova. Proprietário e gerente também podem redefinir a senha de outra pessoa em Equipe — útil quando alguém perde o acesso, mas lembre que quem redefine passa a conhecer a senha daquela conta. Vendedor não tem acesso à tela de Equipe; se esquecer a senha, usa “Esqueci minha senha” no login.",
  },
];

const MODULES = [
  {
    id: "estoque",
    icon: Boxes,
    title: "Estoque",
    body: [
      "Cada produto tem código (único por loja), descrição, tipo/nicho, unidade, preço de venda, custo, quantidade, estoque mínimo, endereço de armazenagem e até 8 fotos.",
      "O estoque mínimo alimenta os alertas do painel: produtos no limite ou abaixo aparecem em “Reposição de estoque”.",
      "Alterar o campo Quantidade na tela do produto não sobrescreve o saldo: o sistema registra um ajuste no histórico. Assim o saldo sempre bate com o razão de movimentações.",
      "Produto inativo deixa de aparecer no PDV e na vitrine, mas continua no histórico de vendas.",
    ],
  },
  {
    id: "movimentacoes",
    icon: Boxes,
    title: "Movimentações",
    body: [
      "Três tipos: Entrada soma ao saldo, Saída subtrai e Ajuste define o saldo final.",
      "O sistema bloqueia saída maior que o saldo disponível, mostrando a quantidade existente.",
      "Cada lançamento guarda quem registrou, quando, o motivo e o saldo após a operação — o extrato completo está na tela do produto.",
      "Ao registrar uma entrada, informe o custo unitário para acompanhar a margem real.",
    ],
  },
  {
    id: "caixa",
    icon: ShoppingCart,
    title: "Caixa e vendas",
    body: [
      "O fluxo é: abrir a sessão de caixa → vender no PDV → fazer sangrias ou suprimentos pelo turno → fechar a sessão conferindo o valor.",
      "No PDV, busque por nome ou código, monte o carrinho, aplique desconto, escolha o cliente e a forma de pagamento. O preço vem sempre do cadastro, nunca do carrinho.",
      "Só venda em dinheiro entra automaticamente como movimento na sessão de caixa. Pix, débito e crédito ficam registrados na venda para conferência.",
      "Em Vendas, cada linha abre a lista de produtos daquela venda ali mesmo, sem sair da tela; o número da venda continua levando à ficha completa.",
      "Vendas não geram lançamento no Financeiro: a receita é lida direto das vendas, evitando contagem dupla.",
      "Cancelar uma venda devolve os itens ao estoque e estorna o valor no caixa. A ação é restrita a proprietário e gerente.",
      "No fechamento, o sistema compara o valor que você contou com o esperado (fundo + entradas − saídas − sangrias + suprimentos) e mostra a diferença.",
    ],
  },
  {
    id: "clientes",
    icon: Users,
    title: "Clientes",
    body: [
      "Cadastre clientes para vincular vendas e acompanhar quantas compras e quanto cada um já gastou.",
      "Clicar no nome abre a ficha do cliente: ticket médio, última compra, dados de contato e a lista das compras realizadas, com link para cada venda.",
      "Só venda paga entra na quantidade e no total gasto; vendas abertas e canceladas aparecem na lista com o status, mas ficam fora da soma.",
      "A busca procura por nome, telefone e documento.",
      "Excluir um cliente mantém o histórico: as vendas passam a aparecer sem vínculo, em vez de serem apagadas.",
    ],
  },
  {
    id: "financeiro",
    icon: BarChart3,
    title: "Financeiro",
    body: [
      "Aqui entram os lançamentos manuais: contas a pagar (fornecedor, aluguel, energia, impostos) e a receber que não vieram de uma venda no PDV.",
      "Filtre por período, tipo e situação. Lançamentos vencidos e ainda pendentes aparecem marcados.",
      "Use “marcar como pago” para dar baixa; é possível reabrir, cancelar ou excluir.",
      "O card “Recebido no período” soma as baixas mais a receita de vendas do Caixa — o detalhamento mostra de onde veio cada parte.",
    ],
  },
  {
    id: "vitrine",
    icon: Globe2,
    title: "Vitrine online",
    body: [
      "Sua landing page é gerada automaticamente a partir do estoque. Você não publica produto por produto.",
      "A página existe desde o momento em que sua loja foi criada: basta cadastrar produtos e ela já está no ar. Não existe etapa técnica, aprovação ou instalação para a loja aparecer.",
      `Configure link, logo, frase principal, texto de apoio, imagem de capa, paleta de cores e contato. Seu endereço fica assim: ${PRODUCT_HOST}/loja/seu-endereco — só a última parte muda, e você pode alterá-la depois.`,
      "Os produtos aparecem agrupados por tipo/nicho, em carrossel, com botão de pedido pelo WhatsApp já com a mensagem pronta.",
      "Produto sem estoque sai do ar sozinho. Se quiser exibi-lo marcado como indisponível, ligue “Mostrar produtos sem estoque”.",
      "Para despublicar temporariamente, desligue a opção de vitrine publicada — só você enxerga o conteúdo.",
      "O endereço do link é a única coisa que você precisa divulgar. Ele funciona em qualquer celular ou computador, sem aplicativo.",
    ],
  },
  {
    id: "equipe",
    icon: Users,
    title: "Equipe",
    body: [
      "Convide as pessoas da loja e defina o papel de cada uma: proprietário, gerente, vendedor, caixa ou cliente. O convite chega por e-mail e a própria pessoa cria a senha pelo link.",
      "Quatro papéis operam a loja: proprietário, gerente, vendedor e caixa. O cliente da vitrine não ocupa assento e não entra no painel.",
      "Cada pessoa ativa que opera a loja ocupa um assento do plano. Ao atingir o limite, o convite é bloqueado até você contratar um assento extra ou mudar de plano.",
      "Enquanto a pessoa não cria a senha, ela aparece como “Convite pendente” na lista. O convite vale por 48 horas e só pode ser usado uma vez.",
      "Proprietário e gerente trocam a própria senha em Equipe → Minha senha. Quem é vendedor não abre essa tela: usa “Esqueci minha senha” na página de login.",
      "O sistema impede remover, desativar ou rebaixar o último proprietário ativo, para que ninguém perca o acesso à loja.",
      "Redefinir a senha de alguém é útil quando a pessoa perde o acesso, mas exige que ela confie em quem redefine.",
    ],
  },
];

type PermissionRow = {
  area: string;
  owner: boolean;
  manager: boolean;
  seller: boolean;
  cashier: boolean;
};

const PERMISSIONS: PermissionRow[] = [
  { area: "Painel e indicadores", owner: true, manager: true, seller: true, cashier: true },
  { area: "Estoque (consultar)", owner: true, manager: true, seller: true, cashier: true },
  { area: "Cadastrar e editar produtos", owner: true, manager: true, seller: false, cashier: false },
  { area: "Tipos e nichos", owner: true, manager: true, seller: false, cashier: false },
  { area: "Movimentações de estoque", owner: true, manager: true, seller: true, cashier: false },
  { area: "PDV e sessões de caixa", owner: true, manager: true, seller: true, cashier: true },
  { area: "Vendas (cancelar)", owner: true, manager: true, seller: false, cashier: false },
  { area: "Clientes (exceto excluir)", owner: true, manager: true, seller: true, cashier: true },
  { area: "Financeiro", owner: true, manager: true, seller: false, cashier: false },
  { area: "Vitrine online", owner: true, manager: true, seller: false, cashier: false },
  { area: "Equipe", owner: true, manager: true, seller: false, cashier: false },
  { area: "Assinatura (contratar, trocar, cancelar)", owner: true, manager: false, seller: false, cashier: false },
];

const FAQ = [
  {
    q: "Registrei uma venda errada. O que faço?",
    a: "Abra Caixa → Vendas, entre na venda e use “Cancelar venda”. O estoque volta automaticamente e, se o pagamento foi em dinheiro, o valor é estornado na sessão de caixa. Essa ação exige perfil de proprietário ou gerente.",
  },
  {
    q: "O saldo do estoque ficou diferente da prateleira. Como corrijo?",
    a: "Use Movimentações com o tipo Ajuste e informe o saldo real contado. O ajuste fica no histórico com motivo e responsável, então a diferença não fica escondida.",
  },
  {
    q: "Por que não consigo abrir o Financeiro?",
    a: "Financeiro, Vitrine e Equipe são restritos a proprietário e gerente. Peça a alguém com esse perfil para ajustar seu papel em Equipe, ou para tratar o assunto por você.",
  },
  {
    q: "A vitrine não mostra um produto. Por quê?",
    a: "Verifique três coisas: se o produto está ativo, se tem quantidade maior que zero (a menos que “Mostrar produtos sem estoque” esteja ligado) e se a vitrine está publicada.",
  },
  {
    q: "Preciso de nota fiscal ou integração com o contador?",
    a: `O ${PRODUCT.name} organiza a operação e os lançamentos financeiros, mas não emite documento fiscal. Para emissão de nota, use o sistema fiscal da sua contabilidade com os dados das vendas registradas aqui.`,
  },
  {
    q: "Como funciona o desconto no PDV?",
    a: "O desconto é aplicado sobre o subtotal da venda e fica registrado no total. O sistema limita o desconto ao valor dos itens, então não é possível fechar uma venda com total negativo.",
  },
  {
    q: "Preciso fazer algo técnico para minha loja ficar no ar?",
    a: `Não. O ${PRODUCT.name} é um sistema único que atende todas as lojas: sua página existe desde o momento em que a loja foi criada. Cadastre os produtos e configure a vitrine — não há instalação, aprovação nem etapa técnica.`,
  },
  {
    q: "Como meus clientes acessam a página da loja?",
    a: `Pelo link que você define em Vitrine online: ${PRODUCT_HOST}/loja/ seguido do endereço escolhido. Funciona em qualquer celular ou computador, sem aplicativo. É só compartilhar esse link — no WhatsApp, no Instagram ou onde preferir.`,
  },
  {
    q: "Cadastrei um produto. Quando ele aparece na vitrine?",
    a: "Imediatamente. A vitrine lê o seu estoque em tempo real, então não há publicação separada: produto ativo com saldo aparece na hora e sai do ar sozinho quando zera.",
  },
  {
    q: "Consigo exportar meus dados?",
    a: `Sim. Os dados são seus. Solicite a exportação em CSV ou JSON pelos canais de contato e também a exclusão completa ao encerrar a conta, respeitados os prazos legais de guarda. Os detalhes estão nos Termos de Uso.`,
  },
  {
    q: "Esqueci minha senha. Como recupero?",
    a: "Na tela de login, use “Esqueci minha senha” e informe o e-mail da conta. Você recebe um link válido por 1 hora, que só pode ser usado uma vez: ao salvar a nova senha, você já entra no painel. Se você nunca chegou a criar a senha — cadastro novo ou convite pendente —, use “Reenviar confirmação”.",
  },
  {
    q: "Não recebi o e-mail para criar minha senha. E agora?",
    a: "Confira a caixa de spam e a aba Promoções. Se ainda não chegou, abra “Reenviar confirmação” na tela de login e informe o mesmo e-mail. O link vale 48 horas e só pode ser usado uma vez. Um pedido novo só é enviado 1 minuto depois do anterior, então não clique várias vezes seguidas: o segundo pedido não gera e-mail.",
  },
  {
    q: "Recebi um convite da equipe. Como começo a usar?",
    a: "Abra o link do e-mail, crie uma senha entre 8 e 72 caracteres e confirme. Você entra direto no painel com o papel definido no convite. Se o link expirou, use “Reenviar confirmação” na tela de login com o e-mail do convite.",
  },
  {
    q: "Qual plano devo escolher?",
    a: "Comece pelo Essencial se você vende sozinho ou tem uma pessoa ajudando. Se a loja tem turnos e mais de dois operadores, o Loja já cobre; com vários caixas no mesmo dia, o Equipe é o mínimo confortável. Duas ou três unidades pedem o Rede, e redes com 50 ou mais funcionários vão de Corporativo. O comparativo detalhado está em Ajuda → Planos e cobrança.",
  },
  {
    q: "O que acontece quando o teste de 14 dias acaba?",
    a: "A loja não é apagada nem cobrada automaticamente: ela passa a modo somente leitura até você contratar um plano. Estoque, vendas, clientes e histórico continuam lá, e a contratação pode ser feita depois, sem cobrança retroativa do período de teste.",
  },
  {
    q: "Como troco de plano ou cancelo?",
    a: "Só o proprietário vê a tela Assinatura. A troca de plano e o ajuste de adicionais valem a partir do próximo vencimento, sem cobrança proporcional. O cancelamento mantém o acesso até o fim do período já pago e não tem multa.",
  },
  {
    q: "O que conta como usuário ativo?",
    a: "Cada pessoa ativa com papel de proprietário, gerente, vendedor ou caixa. Cliente da vitrine não ocupa assento. Desativar alguém libera o assento na hora; reativar volta a ocupá-lo, e o sistema bloqueia a reativação se o limite estiver cheio.",
  },
  {
    q: "Atraso o pagamento. A loja para de funcionar?",
    a: "Não de imediato. Até 7 dias o acesso é completo. Entre 7 e 30 dias, o PDV, o caixa e a vitrine continuam funcionando e só as funções de gestão ficam bloqueadas. Depois de 30 dias, a loja entra em somente leitura e a vitrine sai do ar. Nada é apagado e a reativação é imediata após o pagamento.",
  },
  {
    q: "Dá para ver a senha que estou digitando?",
    a: "Sim. Todo campo de senha tem um ícone de olho no canto direito: um clique mostra o texto, outro esconde. É útil para conferir antes de salvar, principalmente no celular. O ícone apenas muda a exibição na tela — a senha não é guardada nem enviada para lugar nenhum por causa disso.",
  },
];

function PermissionMark({ allowed }: { allowed: boolean }) {
  return allowed ? (
    <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
      <Check className="size-4" />
      <span className="sr-only">Sim</span>
    </span>
  ) : (
    <span className="inline-flex items-center text-ink-300">
      <Minus className="size-4" />
      <span className="sr-only">Não</span>
    </span>
  );
}

export default function AjudaPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
        <CircleHelp className="size-4" />
        Central de ajuda
      </p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-ink-900 sm:text-4xl">
        Como usar o {PRODUCT.name}
      </h1>
      <p className="mt-3 text-base text-ink-600">
        Guia direto ao ponto: o caminho de implantação, como entrar e recuperar a
        senha, o que cada módulo faz, quem pode acessar o quê e as dúvidas mais
        comuns.
      </p>

      <nav className="mt-8 flex flex-wrap gap-2">
        {[
          { href: "#primeiros-passos", label: "Primeiros passos" },
          { href: "#plano", label: "Plano e cobrança" },
          { href: "#acesso", label: "Contas e acesso" },
          { href: "#modulos", label: "Módulos" },
          { href: "#permissoes", label: "Permissões" },
          { href: "#perguntas", label: "Perguntas frequentes" },
          { href: "#suporte", label: "Suporte" },
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

      <section id="primeiros-passos" className="mt-12 scroll-mt-20">
        <h2 className="text-xl font-bold tracking-tight text-ink-900">
          Primeiros passos
        </h2>
        <p className="mt-2 text-sm text-ink-600">
          Nesta ordem, a loja sai do zero e fica operando:
        </p>
        <ol className="mt-5 space-y-4">
          {FIRST_STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                {index + 1}
              </span>
              <div>
                <p className="font-semibold text-ink-900">{step.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-ink-600">
                  {step.text}
                </p>
                <Link
                  href={step.href}
                  className="mt-1 inline-block text-sm font-medium text-brand-700 underline decoration-brand-300 underline-offset-2"
                >
                  {step.cta}
                </Link>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="plano" className="mt-12 scroll-mt-20">
        <h2 className="text-xl font-bold tracking-tight text-ink-900">
          Plano e cobrança
        </h2>
        <p className="mt-2 text-sm text-ink-600">
          A assinatura é da loja, não da pessoa, e começa com 14 dias de teste sem
          cartão. Os planos mudam em três coisas: quantidade de usuários ativos,
          vendas por mês e lojas incluídas — além dos recursos de gestão para
          equipes maiores.
        </p>
        <div className="mt-5 overflow-x-auto rounded-xl border border-ink-200">
          <table className="min-w-full divide-y divide-ink-200 text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Usuários</th>
                <th className="px-4 py-3">Vendas/mês</th>
                <th className="px-4 py-3">Lojas</th>
                <th className="px-4 py-3">A partir de</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {PUBLIC_PLANS.map((plan) => (
                <tr key={plan.code}>
                  <td className="px-4 py-2.5 font-medium text-ink-800">
                    {plan.name}
                  </td>
                  <td className="px-4 py-2.5 text-ink-700">{plan.includedSeats}</td>
                  <td className="px-4 py-2.5 text-ink-700">
                    {plan.includedSalesPerMonth.toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-2.5 text-ink-700">{plan.includedStores}</td>
                  <td className="px-4 py-2.5 text-ink-700">
                    {formatBRL(plan.monthlyCents)}/mês
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-ink-600">
          Usuários ativos são limite firme: o convite é bloqueado quando os
          assentos acabam. Vendas por mês são faixa de uso: o painel avisa ao
          chegar perto do limite, mas as vendas continuam registrando. O Essencial
          é para quem vende sozinho — um único login, o do proprietário. Para
          trabalhar com mais alguém, o Loja inclui três logins (dono + duas
          pessoas) e o Equipe oito; um assento avulso custa R$ 7,90/mês quando você
          só precisa de mais uma pessoa. Cada degrau inclui tudo do anterior. A
          comparação completa, os adicionais, a regra de atraso e o cancelamento
          estão em{" "}
          <Link
            href="/ajuda/planos"
            className="font-medium text-brand-700 underline decoration-brand-300 underline-offset-2"
          >
            Planos e cobrança
          </Link>
          .
        </p>
      </section>

      <section id="acesso" className="mt-12 scroll-mt-20">
        <h2 className="text-xl font-bold tracking-tight text-ink-900">
          Contas e acesso
        </h2>
        <p className="mt-2 text-sm text-ink-600">
          Como entrar pela primeira vez, confirmar o e-mail e recuperar a senha.
        </p>
        <div className="mt-5 space-y-3">
          {ACCESS_TOPICS.map((topic) => (
            <div
              key={topic.title}
              className="rounded-xl border border-ink-200 bg-white px-5 py-4"
            >
              <p className="font-semibold text-ink-900">{topic.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-600">
                {topic.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="modulos" className="mt-12 scroll-mt-20">
        <h2 className="text-xl font-bold tracking-tight text-ink-900">
          Guia dos módulos
        </h2>
        <div className="mt-5 space-y-3">
          {MODULES.map((module) => (
            <details
              key={module.id}
              id={module.id}
              className="group scroll-mt-20 rounded-xl border border-ink-200 bg-white"
            >
              <summary className="flex cursor-pointer items-center gap-3 px-5 py-4 font-semibold text-ink-900 marker:content-['']">
                <module.icon className="size-5 shrink-0 text-brand-600" />
                <span className="flex-1">{module.title}</span>
                <span className="text-xs font-medium text-ink-400 group-open:hidden">
                  abrir
                </span>
                <span className="hidden text-xs font-medium text-ink-400 group-open:inline">
                  fechar
                </span>
              </summary>
              <ul className="space-y-2 border-t border-ink-100 px-5 py-4 text-sm leading-relaxed text-ink-600">
                {module.body.map((paragraph, index) => (
                  <li key={index} className="flex gap-2.5">
                    <span
                      aria-hidden
                      className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-300"
                    />
                    <span>{paragraph}</span>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </section>

      <section id="permissoes" className="mt-12 scroll-mt-20">
        <h2 className="text-xl font-bold tracking-tight text-ink-900">
          Quem pode acessar o quê
        </h2>
        <p className="mt-2 text-sm text-ink-600">
          O papel é definido por pessoa, em Equipe. O caixa opera o PDV e o
          fechamento de turno, mas não altera saldo de estoque nem executa ações de
          gestão. O perfil de cliente é reservado ao consumidor da vitrine e não dá
          acesso ao painel.
        </p>
        <div className="mt-5 overflow-x-auto rounded-xl border border-ink-200">
          <table className="min-w-full divide-y divide-ink-200 text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">Área</th>
                <th className="px-4 py-3 text-center">Proprietário</th>
                <th className="px-4 py-3 text-center">Gerente</th>
                <th className="px-4 py-3 text-center">Vendedor</th>
                <th className="px-4 py-3 text-center">Caixa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {PERMISSIONS.map((row) => (
                <tr key={row.area}>
                  <td className="px-4 py-2.5 text-ink-700">{row.area}</td>
                  <td className="px-4 py-2.5 text-center">
                    <PermissionMark allowed={row.owner} />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <PermissionMark allowed={row.manager} />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <PermissionMark allowed={row.seller} />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <PermissionMark allowed={row.cashier} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="perguntas" className="mt-12 scroll-mt-20">
        <h2 className="text-xl font-bold tracking-tight text-ink-900">
          Perguntas frequentes
        </h2>
        <div className="mt-5 space-y-3">
          {FAQ.map((item) => (
            <details
              key={item.q}
              className="group rounded-xl border border-ink-200 bg-white"
            >
              <summary className="flex cursor-pointer items-center gap-3 px-5 py-4 text-sm font-semibold text-ink-900 marker:content-['']">
                <span className="flex-1">{item.q}</span>
                <span className="text-xs font-medium text-ink-400 group-open:hidden">
                  abrir
                </span>
                <span className="hidden text-xs font-medium text-ink-400 group-open:inline">
                  fechar
                </span>
              </summary>
              <p className="border-t border-ink-100 px-5 py-4 text-sm leading-relaxed text-ink-600">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section id="suporte" className="mt-12 scroll-mt-20">
        <div className="rounded-2xl bg-ink-50 px-6 py-8">
          <h2 className="text-xl font-bold tracking-tight text-ink-900">
            Não encontrou a resposta?
          </h2>
          <p className="mt-2 text-sm text-ink-600">
            Fale com o suporte em <strong>{COMPANY.contactEmail}</strong>. Para
            agilizar, informe o nome da loja, o módulo e o que você esperava que
            acontecesse.
          </p>
          {COMPANY.privacyEmail ? (
            <p className="mt-3 text-sm text-ink-600">
              Para assuntos de dados pessoais, use{" "}
              <strong>{COMPANY.privacyEmail}</strong>.
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/termos" className="btn btn-secondary">
              Termos de Uso
            </Link>
            <Link href="/privacidade" className="btn btn-secondary">
              Política de Privacidade
            </Link>
            <Link href="/afiliados" className="btn btn-secondary">
              Programa de afiliados
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
