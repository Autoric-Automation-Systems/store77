import type { Metadata } from "next";
import Link from "next/link";
import { Bullets, ContactBlock, LegalPage, Section } from "../legal-ui";
import { COMPANY, LEGAL_UPDATED_AT, PRODUCT, SUBPROCESSORS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Como o Store77 coleta, usa, compartilha e protege dados pessoais, conforme a LGPD.",
};

export default function PrivacidadePage() {
  return (
    <LegalPage
      title="Política de Privacidade"
      updatedAt={LEGAL_UPDATED_AT}
      summary="Esta política explica quais dados pessoais o Store77 trata, para quê, com quem compartilha e como você exerce seus direitos, nos termos da Lei nº 13.709/2018 (LGPD)."
    >
      <Section id="quem-somos" title="1. Quem trata seus dados">
        <p>O {PRODUCT.name} é um software de gestão para lojas, fornecido por:</p>
        <ContactBlock />
        <p>
          Nesta política, <strong>&ldquo;nós&rdquo;</strong> somos esse fornecedor e{" "}
          <strong>&ldquo;você&rdquo;</strong> é o titular dos dados.
        </p>
      </Section>

      <Section id="papeis" title="2. Dois papéis diferentes (importante)">
        <p>
          O {PRODUCT.name} opera em duas posições distintas na LGPD, e isso muda a
          quem você deve pedir cada coisa:
        </p>
        <Bullets
          items={[
            <>
              <strong>Somos controladores</strong> dos dados de quem cria a conta da
              loja (nome, e-mail e senha do lojista e dos membros da equipe).
              Respondemos diretamente por eles.
            </>,
            <>
              <strong>Somos operadores</strong> dos dados que a loja insere sobre seus
              próprios clientes, vendas e produtos. Quem decide e responde por esse
              conteúdo é o <strong>lojista</strong> (controlador). Se você é cliente
              de uma loja que usa o {PRODUCT.name}, procure a loja.
            </>,
          ]}
        />
      </Section>

      <Section id="dados" title="3. Quais dados tratamos">
        <p>Dados de cadastro da conta e da loja:</p>
        <Bullets
          items={[
            "Nome, e-mail, senha (guardada apenas como hash bcrypt — não temos acesso à sua senha) e telefone dos usuários da loja.",
            "Dados da empresa: nome, razão social, CNPJ, endereço, telefone, WhatsApp e e-mail de contato.",
            "Conteúdo da vitrine: logo, textos, cores e imagens enviadas.",
          ]}
        />
        <p className="pt-2">Dados operacionais inseridos pela loja:</p>
        <Bullets
          items={[
            "Produtos: código, descrição, preço, custo, quantidade, local de armazenagem e fotos.",
            "Clientes da loja: nome, telefone, e-mail, documento e endereço.",
            "Vendas, itens vendidos, movimentações de estoque e lançamentos financeiros.",
          ]}
        />
        <p className="pt-2">Dados técnicos:</p>
        <Bullets
          items={[
            "Registros de acesso e erro gerados pela hospedagem, incluindo endereço IP e identificação do navegador, para segurança e diagnóstico.",
            "Um cookie de sessão para manter você autenticado.",
          ]}
        />
      </Section>

      <Section id="cookies" title="4. Cookies">
        <p>
          Usamos <strong>um único cookie</strong>, <code>store77_session</code>, que
          é essencial: ele guarda um token assinado que identifica sua sessão. Ele é{" "}
          <code>httpOnly</code> (não é acessível por JavaScript na página),{" "}
          <code>sameSite=lax</code> e marcado como <code>secure</code> em produção.
        </p>
        <p>
          Não usamos cookies de publicidade, rastreamento entre sites ou
          compartilhamento com redes de anúncios. Por isso não exibimos banner de
          consentimento de cookies: os estritamente necessários são dispensados de
          consentimento pela LGPD e pelas normas da ANPD.
        </p>
      </Section>

      <Section id="finalidades" title="5. Para que usamos e com que base legal">
        <Bullets
          items={[
            <>
              <strong>Executar o contrato</strong> (art. 7º, V): criar sua conta,
              autenticar o acesso, manter o estoque, o caixa e a vitrine funcionando.
            </>,
            <>
              <strong>Cumprir obrigação legal</strong> (art. 7º, II): guardar registros
              fiscais e de acesso quando a lei exigir.
            </>,
            <>
              <strong>Legítimo interesse</strong> (art. 7º, IX): segurança da
              plataforma, prevenção a fraude e melhoria do produto a partir de
              métricas agregadas.
            </>,
            <>
              <strong>Consentimento</strong> (art. 7º, I): comunicações de novidades,
              quando você optar por recebê-las. Pode ser revogado a qualquer momento.
            </>,
          ]}
        />
        <p>
          Não usamos seus dados nem os dados dos clientes da sua loja para treinar
          modelos, e não vendemos dados pessoais.
        </p>
      </Section>

      <Section id="compartilhamento" title="6. Com quem compartilhamos">
        <p>
          Trabalhamos com poucos fornecedores, que tratam dados apenas para
          viabilizar o serviço:
        </p>
        <div className="overflow-hidden rounded-xl border border-ink-200">
          <table className="min-w-full divide-y divide-ink-200 text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-2.5">Fornecedor</th>
                <th className="px-4 py-2.5">Finalidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {SUBPROCESSORS.map((vendor) => (
                <tr key={vendor.name}>
                  <td className="px-4 py-2.5 font-medium text-ink-800">
                    {vendor.name}
                  </td>
                  <td className="px-4 py-2.5 text-ink-600">{vendor.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Também podemos compartilhar dados para cumprir ordem judicial ou
          requisição de autoridade competente.
        </p>
        <p>
          <strong>Transferência internacional:</strong> esses fornecedores mantêm
          infraestrutura fora do Brasil, sobretudo nos Estados Unidos. A
          transferência ocorre com base no art. 33 da LGPD, amparada em cláusulas
          contratuais e no compromisso de proteção adotado por cada fornecedor.
        </p>
      </Section>

      <Section id="retencao" title="7. Por quanto tempo guardamos">
        <Bullets
          items={[
            "Dados da conta e da loja: enquanto a conta existir. Após o encerramento, excluímos em até 30 dias.",
            "Dados operacionais da loja: sob controle do lojista, pelo tempo que ele definir.",
            "Registros de acesso: por pelo menos 6 meses, conforme o art. 15 do Marco Civil da Internet.",
            "Documentos fiscais: pelos prazos da legislação tributária, quando aplicável.",
          ]}
        />
        <p>
          Você pode solicitar a exclusão antecipada dos dados de cadastro; nesse
          caso, mantemos apenas o que a lei obriga a preservar.
        </p>
      </Section>

      <Section id="seguranca" title="8. Como protegemos">
        <Bullets
          items={[
            "Senhas nunca são armazenadas em texto: usamos hash bcrypt.",
            "Sessão via token JWT assinado, em cookie httpOnly, com expiração.",
            "Todo acesso é isolado por loja: cada consulta filtra pelo identificador da loja do usuário autenticado.",
            "Tráfego criptografado com TLS de ponta a ponta.",
            "Banco gerenciado, com credenciais restritas e backup automático.",
            "Perfis de acesso distintos (proprietário, gerente, vendedor e cliente), com os módulos sensíveis restritos à gestão.",
          ]}
        />
        <p>
          Nenhum sistema é infalível. Se ocorrer um incidente de segurança com
          risco relevante, comunicaremos os titulares afetados e a ANPD, conforme o
          art. 48 da LGPD.
        </p>
      </Section>

      <Section id="direitos" title="9. Seus direitos">
        <p>
          A LGPD garante a você, a qualquer momento e sem custo, a confirmação da
          existência de tratamento e também:
        </p>
        <Bullets
          items={[
            "acesso aos dados;",
            "correção de dados incompletos, inexatos ou desatualizados;",
            "anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos;",
            "portabilidade a outro fornecedor;",
            "eliminação dos dados tratados com consentimento;",
            "informação sobre compartilhamentos;",
            "informação sobre a possibilidade de não consentir e suas consequências;",
            "revogação do consentimento.",
          ]}
        />
        <p>
          Muito do que você precisa já está dentro do produto: os dados da própria
          loja podem ser consultados, corrigidos e excluídos diretamente nos módulos
          de Estoque, Clientes, Vendas e Financeiro.
        </p>
        <p>
          Para os demais pedidos, escreva para{" "}
          <strong>{COMPANY.privacyEmail}</strong>. Se você é cliente de uma loja,
          dirija-se primeiro à loja, que é a controladora dos seus dados — nós
          ajudamos a loja a atender o pedido.
        </p>
      </Section>

      <Section id="menores" title="10. Menores de idade">
        <p>
          O {PRODUCT.name} é destinado a uso comercial e não é direcionado a menores
          de 18 anos. Não coletamos intencionalmente dados de crianças e
          adolescentes. Se identificarmos esse caso, os dados serão eliminados.
        </p>
      </Section>

      <Section id="alteracoes" title="11. Alterações desta política">
        <p>
          Podemos atualizar este documento para refletir mudanças no produto ou na
          lei. A data de revisão no topo sempre indica a versão vigente. Alterações
          relevantes serão comunicadas no aplicativo ou por e-mail antes de entrar
          em vigor.
        </p>
      </Section>

      <Section id="contato" title="12. Contato">
        <p>
          Dúvidas sobre privacidade ou pedidos de titular:{" "}
          <strong>{COMPANY.privacyEmail}</strong>. Assuntos gerais:{" "}
          <strong>{COMPANY.contactEmail}</strong>.
        </p>
        <p>
          Veja também os{" "}
          <Link
            href="/termos"
            className="font-medium text-brand-700 underline decoration-brand-300 underline-offset-2"
          >
            Termos de Uso
          </Link>{" "}
          e a{" "}
          <Link
            href="/ajuda"
            className="font-medium text-brand-700 underline decoration-brand-300 underline-offset-2"
          >
            Ajuda
          </Link>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
