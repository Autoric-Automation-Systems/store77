/**
 * Dados jurídicos do fornecedor do Store77.
 *
 * A Política de Privacidade e os Termos de Uso leem daqui — este é o único
 * lugar para editar. Campos deixados como `null` simplesmente não aparecem na
 * página, em vez de exibir um marcador.
 */
export const COMPANY = {
  legalName: "Autoric Automação e Sistemas",
  cnpj: "33.019.320/0001-42",
  contactEmail: "autoricbr@gmail.com",
  site: "https://autoric.com.br",
  address:
    "Rua Abel Carvalho, 358 — Monte Belo, Gravataí/RS, CEP 94055-290",
  privacyEmail: "autoricbr@gmail.com",
} as const;

/**
 * Canal para pedidos de titular de dados (LGPD). Sem um encarregado dedicado, o
 * contato geral já atende.
 */
export const PRIVACY_CONTACT: string =
  COMPANY.privacyEmail ?? COMPANY.contactEmail;

export const PRODUCT = {
  name: "Store77",
  url: "https://www.store77.com.br",
  tagline: "Gestão de estoque, caixa, financeiro e vitrine online para lojas",
} as const;

/** Domínio sem o esquema, para exibir em textos de ajuda. */
export const PRODUCT_HOST = PRODUCT.url.replace(/^https?:\/\//, "");

/** Data da última revisão exibida no topo dos documentos. */
export const LEGAL_UPDATED_AT = "18 de outubro de 2026";

/** Subprocessadores citados na Política de Privacidade. */
export const SUBPROCESSORS = [
  {
    name: "Vercel",
    role: "Hospedagem da aplicação e entrega de conteúdo",
  },
  {
    name: "Neon",
    role: "Banco de dados PostgreSQL gerenciado",
  },
  {
    name: "Vercel Blob",
    role: "Armazenamento das fotos de produtos e da identidade visual da loja",
  },
] as const;
