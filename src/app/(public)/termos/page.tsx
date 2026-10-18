import type { Metadata } from "next";
import Link from "next/link";
import { Bullets, ContactBlock, LegalPage, Section } from "../legal-ui";
import { COMPANY, LEGAL_UPDATED_AT, PRODUCT } from "@/lib/legal";
import { FULL_ACCESS_GRACE_DAYS, POS_GRACE_DAYS, TRIAL_DAYS } from "@/lib/billing/plans";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description:
    "Condições de uso da plataforma Store77: conta, uso aceitável, dados, propriedade intelectual e responsabilidades.",
};

export default function TermosPage() {
  return (
    <LegalPage
      title="Termos de Uso"
      updatedAt={LEGAL_UPDATED_AT}
      summary="Estas são as condições que regem o uso da plataforma Store77. Ao criar uma conta ou utilizar o sistema, você concorda com elas."
    >
      <Section id="aceitacao" title="1. Aceitação">
        <p>
          Ao criar uma conta, acessar ou usar o {PRODUCT.name}, você declara ter
          lido e aceito estes Termos de Uso e a{" "}
          <Link
            href="/privacidade"
            className="font-medium text-brand-700 underline decoration-brand-300 underline-offset-2"
          >
            Política de Privacidade
          </Link>
          . Se não concordar, não utilize a plataforma.
        </p>
        <p>
          Se você aceita em nome de uma empresa, declara ter poderes para
          representá-la, e &ldquo;você&rdquo; passa a designar essa pessoa jurídica.
        </p>
      </Section>

      <Section id="fornecedor" title="2. Fornecedor do serviço">
        <ContactBlock />
      </Section>

      <Section id="servico" title="3. O que é o serviço">
        <p>
          O {PRODUCT.name} é um software como serviço (SaaS) para gestão de lojas,
          com os módulos de estoque, movimentações, caixa, vendas, clientes,
          financeiro, equipe e uma página pública da loja (&ldquo;vitrine&rdquo;).
        </p>
        <p>É importante entender os limites do produto:</p>
        <Bullets
          items={[
            <>
              A <strong>vitrine é informativa e gerada automaticamente</strong> a
              partir do seu estoque. Ela não processa pagamentos: o contato com o
              consumidor acontece pelo WhatsApp ou pelos canais que você cadastrar.
            </>,
            <>
              O módulo Financeiro organiza <strong>contas a pagar e a receber</strong>{" "}
              a partir das informações que você insere. Ele não substitui
              contabilidade formal nem emissão de documento fiscal.
            </>,
            <>
              Os relatórios refletem os dados lançados por você. A consistência do
              estoque e dos valores depende dos lançamentos e das conferências
              realizadas pela sua equipe.
            </>,
          ]}
        />
      </Section>

      <Section id="conta" title="4. Conta e responsabilidades do usuário">
        <Bullets
          items={[
            "Você deve fornecer informações verdadeiras, exatas e atualizadas no cadastro.",
            "Sua senha é pessoal e intransferível. Você é responsável por mantê-la em sigilo e por tudo que ocorrer na conta por meio dela.",
            "Cada membro da equipe deve ter o próprio acesso. Não compartilhe logins: as movimentações de estoque e sessões de caixa ficam vinculadas ao usuário que as registrou.",
            "Você é responsável por conceder o papel adequado a cada pessoa (proprietário, gerente, vendedor, caixa ou cliente) e por revogar acessos de quem sair da equipe.",
            "A loja é a única responsável pelos dados que insere sobre seus clientes, pela base legal para tratá-los e por atender os pedidos desses titulares.",
            "Você deve manter um proprietário ativo na conta: o sistema impede a remoção do último, para evitar perda de acesso.",
          ]}
        />
      </Section>

      <Section id="uso-aceitavel" title="5. Uso aceitável">
        <p>Ao usar o {PRODUCT.name}, você se compromete a não:</p>
        <Bullets
          items={[
            "inserir conteúdo ilícito, ofensivo, que viole direitos de terceiros ou que seja fraudulento;",
            "usar a plataforma para vender produtos proibidos por lei ou de origem não comprovada;",
            "tentar acessar dados de outra loja, burlar o isolamento entre contas ou explorar falhas de segurança;",
            "realizar engenharia reversa, copiar, revender ou sublicenciar o software sem autorização escrita;",
            "sobrecarregar a infraestrutura com automações não autorizadas, raspagem de dados ou ataques;",
            "usar a plataforma para enviar spam ou mensagens não solicitadas aos seus clientes.",
          ]}
        />
        <p>
          O descumprimento pode levar à suspensão do acesso, sem prejuízo das
          medidas cabíveis.
        </p>
      </Section>

      <Section id="dados-titularidade" title="6. Seus dados continuam seus">
        <p>
          Todo o conteúdo que você insere — produtos, preços, clientes, vendas,
          imagens e textos da vitrine — pertence a você. Nós apenas o armazenamos e
          processamos para prestar o serviço.
        </p>
        <p>
          Você pode consultar, corrigir e excluir esses dados a qualquer momento
          pelos próprios módulos do sistema. Ao encerrar a conta, você pode
          solicitar uma exportação em formato aberto (CSV/JSON) e a exclusão dos
          dados, observados os prazos legais de guarda.
        </p>
      </Section>

      <Section id="propriedade" title="7. Propriedade intelectual">
        <p>
          O software, a marca {PRODUCT.name}, o código-fonte, o layout e a
          documentação são de titularidade do fornecedor e protegidos pela
          legislação de propriedade intelectual. Estes Termos concedem a você uma
          licença de uso limitada, não exclusiva e revogável, restrita à finalidade
          de operar a sua loja durante a vigência do contrato.
        </p>
        <p>
          A licença não transfere qualquer direito de propriedade sobre o software.
        </p>
      </Section>

      <Section id="disponibilidade" title="8. Disponibilidade e manutenção">
        <p>
          Trabalhamos para manter o serviço disponível de forma contínua, mas não
          garantimos operação ininterrupta ou livre de erros. O serviço depende de
          fornecedores de infraestrutura e pode sofrer indisponibilidades
          temporárias, inclusive para manutenção programada e correções de
          segurança.
        </p>
        <p>
          Recomendamos conferir periodicamente seus dados e manter cópias das
          informações críticas do seu negócio.
        </p>
      </Section>

      <Section id="precos" title="9. Planos, preços e pagamento">
        <p>
          O {PRODUCT.name} é oferecido por assinatura, cobrada por loja, em ciclo
          mensal ou anual. Os planos, limites, adicionais e preços vigentes estão
          publicados na própria plataforma, em{" "}
          <Link
            href="/ajuda/planos"
            className="font-medium text-brand-700 underline decoration-brand-300 underline-offset-2"
          >
            Planos e cobrança
          </Link>
          , e a contratação é feita pelo proprietário da loja na tela Assinatura.
        </p>
        <p>
          Toda loja recebe {TRIAL_DAYS} dias de teste sem cobrança e sem cartão. Ao
          final do teste, a ausência de contratação não gera débito retroativo: a
          loja passa a modo somente leitura até que um plano seja contratado.
        </p>
        <p>
          Os pagamentos são processados por gateway terceirizado (Asaas), por Pix,
          boleto ou cartão de crédito. Não armazenamos dados completos de cartão. O
          cartão, quando usado, autoriza a renovação automática a cada ciclo; Pix e
          boleto geram uma fatura por ciclo, cujo não pagamento sujeita a loja às
          regras de atraso abaixo.
        </p>
        <p>
          Cada cobrança gera uma fatura com o valor efetivamente cobrado, disponível
          na tela Assinatura. O valor registrado na fatura não é alterado por
          mudanças posteriores de tabela.
        </p>
        <Bullets
          items={[
            <>
              <strong>Atraso:</strong> até {FULL_ACCESS_GRACE_DAYS} dias o acesso é
              completo; entre {FULL_ACCESS_GRACE_DAYS} e {POS_GRACE_DAYS} dias ficam
              bloqueadas as funções de gestão, mas o PDV, o caixa e a vitrine
              continuam ativos; após {POS_GRACE_DAYS} dias a loja é suspensa e a
              vitrine sai do ar, sem exclusão de dados.
            </>,
            <>
              <strong>Reativação:</strong> ao regularizar, o acesso é restabelecido
              imediatamente, sem taxa.
            </>,
            <>
              <strong>Mudança de plano e adicionais:</strong> o novo valor passa a
              valer no ciclo seguinte, sem cobrança proporcional nem crédito
              retroativo, salvo ajuste manual acordado com o suporte.
            </>,
            <>
              <strong>Cancelamento:</strong> pode ser solicitado a qualquer momento
              pelo proprietário; o acesso permanece até o fim do período já pago e
              não há multa. Valores já pagos não são devolvidos, salvo hipótese
              prevista em lei.
            </>,
            <>
              <strong>Reajuste:</strong> comunicado com pelo menos 30 dias de
              antecedência e aplicado a partir do ciclo seguinte.
            </>,
          ]}
        />
        <p>
          O fornecimento de nota fiscal de serviço deve ser solicitado pelos canais
          de contato, com os dados fiscais da loja.
        </p>
      </Section>

      <Section id="suspensao" title="10. Suspensão e encerramento">
        <p>Podemos suspender ou encerrar o acesso quando:</p>
        <Bullets
          items={[
            "houver descumprimento destes Termos;",
            "houver uso que coloque em risco a segurança da plataforma ou de terceiros;",
            "houver determinação legal ou judicial;",
            "a assinatura for cancelada ou os pagamentos ficarem em atraso além dos prazos do item 9;",
          ]}
        />
        <p>
          Você pode encerrar sua conta a qualquer momento solicitando pelos canais
          de contato. Após o encerramento, havendo dados a preservar por obrigação
          legal, eles serão mantidos pelos prazos exigidos e depois eliminados.
        </p>
      </Section>

      <Section id="responsabilidade" title="11. Limitação de responsabilidade">
        <p>
          O serviço é fornecido no estado em que se encontra. Na máxima extensão
          permitida pela legislação brasileira, o fornecedor não responde por:
        </p>
        <Bullets
          items={[
            "lucros cessantes, perda de faturamento ou de oportunidades comerciais;",
            "erros decorrentes de informações incorretas lançadas pelos usuários da loja;",
            "prejuízos causados por compartilhamento indevido de senha ou por acessos concedidos a terceiros pela própria loja;",
            "indisponibilidades de fornecedores de infraestrutura, de internet ou caso fortuito e força maior.",
          ]}
        />
        <p>
          Nada nestes Termos exclui responsabilidades que a lei não permita excluir,
          especialmente as do Código de Defesa do Consumidor quando aplicável.
        </p>
      </Section>

      <Section id="privacidade" title="12. Privacidade">
        <p>
          O tratamento de dados pessoais é descrito na{" "}
          <Link
            href="/privacidade"
            className="font-medium text-brand-700 underline decoration-brand-300 underline-offset-2"
          >
            Política de Privacidade
          </Link>
          , que integra estes Termos. Em resumo: somos controladores dos dados de
          cadastro dos lojistas e operadores dos dados que a loja insere sobre seus
          próprios clientes.
        </p>
      </Section>

      <Section id="alteracoes" title="13. Alterações destes Termos">
        <p>
          Podemos atualizar estes Termos para refletir mudanças no produto, na lei
          ou na nossa operação. A data de revisão no topo indica a versão vigente.
          Alterações relevantes serão comunicadas no aplicativo ou por e-mail com
          antecedência razoável; o uso continuado após a vigência significa
          concordância.
        </p>
      </Section>

      <Section id="lei-foro" title="14. Lei aplicável e foro">
        <p>
          Estes Termos são regidos pelas leis brasileiras, em especial pelo Código
          Civil, pelo Código de Defesa do Consumidor quando aplicável e pela Lei nº
          13.709/2018 (LGPD).
        </p>
        <p>
          Fica eleito o foro da comarca do domicílio do fornecedor para dirimir
          controvérsias, salvo quando a lei assegurar ao consumidor a escolha do seu
          próprio domicílio.
        </p>
      </Section>

      <Section id="contato" title="15. Contato">
        <p>
          Dúvidas sobre estes Termos: <strong>{COMPANY.contactEmail}</strong>
          {COMPANY.privacyEmail ? (
            <>
              . Para questões de privacidade:{" "}
              <strong>{COMPANY.privacyEmail}</strong>.
            </>
          ) : (
            "."
          )}
        </p>
      </Section>
    </LegalPage>
  );
}
