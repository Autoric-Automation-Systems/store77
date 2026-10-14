/**
 * Dados jurídicos do fornecedor do Store77.
 *
 * TODO(preencher): os campos marcados com colchetes precisam ser substituídos
 * antes de publicar. A Política de Privacidade e os Termos de Uso exibem o
 * conteúdo deste arquivo, então não há outro lugar para editar.
 *
 * Este documento foi redigido como base técnica e precisa de revisão jurídica
 * antes de ser tratado como contrato definitivo.
 */
export const COMPANY = {
  legalName: "[RAZÃO SOCIAL — ex.: Autoric Automação e Sistemas LTDA]",
  cnpj: "[CNPJ]",
  address: "[ENDEREÇO COMPLETO — cidade/UF]",
  contactEmail: "[E-MAIL DE CONTATO]",
  privacyEmail: "[E-MAIL DO ENCARREGADO (DPO)]",
  site: "[SITE — ex.: https://autoric.com.br]",
} as const;

export const PRODUCT = {
  name: "Store77",
  tagline: "Gestão de estoque, caixa, financeiro e vitrine online para lojas",
} as const;

/** Data da última revisão exibida no topo dos documentos. */
export const LEGAL_UPDATED_AT = "13 de outubro de 2026";

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
