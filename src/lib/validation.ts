import { z } from "zod";
import { isValidDocument, onlyDigits } from "./document";
import { parseMoneyToCents } from "./format";
import { slugify } from "./slug";

export const emailSchema = z
  .string()
  .trim()
  .min(5, "Informe um e-mail válido")
  .max(160)
  .email("Informe um e-mail válido")
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, "A senha deve ter ao menos 8 caracteres")
  .max(72, "A senha deve ter no máximo 72 caracteres");

/**
 * Maior valor que cabe em `integer` no Postgres (colunas de centavos).
 * Sem este teto, um valor absurdo estoura o INSERT e vira erro 500.
 */
const MAX_INT4 = 2_147_483_647;

/**
 * Valor monetário em reais -> centavos. Negativo é sempre erro de digitação:
 * preço, custo, desconto e valores de caixa não podem inverter o sinal do
 * lançamento (venda que credita o caixa, desconto que aumenta o total).
 */
export const moneySchema = z
  .union([z.string(), z.number()])
  .transform((value) => parseMoneyToCents(value as string | number))
  .refine((cents) => cents >= 0, "Informe um valor igual ou maior que zero")
  .refine((cents) => cents <= MAX_INT4, "Valor acima do limite permitido");

/**
 * Valor monetário opcional: campo em branco vira `null` (a loja não cobra
 * diferente nesse cenário), e não zero, que seria um preço de graça.
 */
export const optionalMoneySchema = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === "string" && value.trim() === "") return null;
    return parseMoneyToCents(value);
  })
  .refine(
    (cents) => cents === null || cents >= 0,
    "Informe um valor igual ou maior que zero",
  )
  .refine(
    (cents) => cents === null || cents <= MAX_INT4,
    "Valor acima do limite permitido",
  );

/**
 * WhatsApp é usado para montar o link `wa.me`, que exige o número em formato
 * internacional: código do país + DDD + número, só dígitos. Aceitamos a digitação
 * com pontuação e limpamos aqui, mas o código do país precisa vir.
 */
export const whatsappSchema = z
  .union([z.string(), z.literal("")])
  .optional()
  .transform((value) => {
    const onlyDigits = (value ?? "").replace(/\D/g, "");
    return onlyDigits.length > 0 ? onlyDigits : null;
  })
  .refine(
    (value) => value === null || (value.length >= 12 && value.length <= 15),
    "Inclua o código do país: para o Brasil, comece com 55 (ex.: 5511999999999)",
  );

export const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : null));

/**
 * Checkbox HTML: ausente no FormData = desmarcado. `z.coerce.boolean()` não
 * serve aqui porque trata a string "false" como verdadeiro.
 */
export const booleanField = z.preprocess(
  (value) => value === true || value === "on" || value === "true" || value === "1",
  z.boolean(),
);

export const registerSchema = z.object({
  storeName: z.string().trim().min(2, "Informe o nome da loja").max(120),
  name: z.string().trim().min(2, "Informe seu nome").max(120),
  email: emailSchema,
  acceptTerms: booleanField.refine(
    (value) => value === true,
    "É preciso aceitar os Termos de Uso e a Política de Privacidade",
  ),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe a senha"),
});

/**
 * Cadastro de afiliado: o próprio afiliado se credencia e recebe o link na
 * hora. Documento e chave Pix são exigidos porque o repasse é por Pix e o
 * documento é a contraparte fiscal.
 */
export const affiliateRegisterSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, "Informe seu nome completo")
      .max(120, "Use no máximo 120 caracteres"),
    email: emailSchema,
    document: z
      .string()
      .trim()
      .transform((value) => onlyDigits(value))
      .refine(isValidDocument, "Informe um CPF ou CNPJ válido"),
    pixKey: z
      .string()
      .trim()
      .min(5, "Informe a chave Pix que vai receber os repasses")
      .max(140, "Use no máximo 140 caracteres"),
    notes: optionalText(600),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirme a senha"),
    acceptTerms: booleanField.refine(
      (value) => value === true,
      "É preciso aceitar os Termos de Uso e a Política de Privacidade",
    ),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem",
  });

export const affiliateLoginSchema = loginSchema;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const setPasswordSchema = z
  .object({
    token: z.string().min(20, "Link inválido"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirme a senha"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem",
  });

export const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Informe o nome").max(80),
  kind: z.enum(["TIPO", "NICHO"]).default("TIPO"),
  description: optionalText(240),
});

export const MAX_INSTALLMENTS = 12;

export const productSchema = z
  .object({
    id: z.string().uuid().optional(),
    code: z
      .string()
      .trim()
      .min(1, "Informe o código")
      .max(40, "O código deve ter no máximo 40 caracteres"),
    name: z
      .string()
      .trim()
      .min(2, "Informe a descrição")
      .max(160, "A descrição deve ter no máximo 160 caracteres"),
    description: optionalText(2000),
    categoryId: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value && value.length > 0 ? value : null)),
    barcode: optionalText(60),
    unit: z.string().trim().max(6).default("UN"),
    priceCents: moneySchema,
    costCents: moneySchema,
    creditPriceCents: optionalMoneySchema,
    installments: z.coerce
      .number()
      .int()
      .min(1, "Informe ao menos 1x")
      .max(MAX_INSTALLMENTS, `Use no máximo ${MAX_INSTALLMENTS} parcelas`)
      .default(1),
    quantity: z.coerce
      .number()
      .int()
      .min(0, "Quantidade não pode ser negativa")
      .max(MAX_INT4, "Quantidade acima do limite permitido"),
    minQuantity: z.coerce
      .number()
      .int()
      .min(0)
      .max(MAX_INT4, "Quantidade acima do limite permitido")
      .default(0),
    location: optionalText(120),
    active: booleanField.default(true),
    images: z.array(z.string().trim().min(1)).max(8).default([]),
  })
  // Preço de crédito menor que o à vista é erro de digitação: inverteria o
  // desconto anunciado na vitrine.
  .refine(
    (data) =>
      data.creditPriceCents === null || data.creditPriceCents >= data.priceCents,
    {
      path: ["creditPriceCents"],
      message: "O preço no crédito não pode ser menor que o preço à vista",
    },
  );

export const stockMovementSchema = z.object({
  productId: z.string().uuid("Selecione um produto"),
  type: z.enum(["ENTRADA", "SAIDA", "AJUSTE"]),
  quantity: z.coerce
    .number()
    .int()
    .positive("Informe uma quantidade maior que zero")
    .max(MAX_INT4, "Quantidade acima do limite permitido"),
  unitCostCents: moneySchema.optional(),
  reason: optionalText(160),
});

export const customerSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Informe o nome").max(120),
  email: z
    .union([z.string().trim().email("E-mail inválido"), z.literal("")])
    .optional()
    .transform((value) => (value ? value : null)),
  phone: optionalText(40),
  document: optionalText(30),
  address: optionalText(240),
  notes: optionalText(500),
});

export const storeSettingsSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da loja").max(120),
  slug: z
    .string()
    .trim()
    .min(3, "O link deve ter ao menos 3 caracteres")
    .transform((value) => slugify(value))
    .refine(
      (value) => value.length >= 3,
      "Use ao menos 3 letras ou números no link",
    ),
  whatsapp: whatsappSchema,
  phone: optionalText(40),
  email: z
    .union([z.string().trim().email("E-mail inválido"), z.literal("")])
    .optional()
    .transform((value) => (value ? value : null)),
  address: optionalText(240),
  logoUrl: optionalText(400),
  heroTitle: optionalText(120),
  heroSubtitle: optionalText(200),
  heroImageUrl: optionalText(400),
  aboutText: optionalText(1200),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use #RRGGBB"),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use #RRGGBB"),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use #RRGGBB"),
  isPublic: booleanField.default(false),
  showOutOfStock: booleanField.default(false),
});

export const teamMemberSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(120),
  email: emailSchema,
  role: z.enum(["GERENTE", "VENDEDOR", "CAIXA", "CLIENTE"]),
});

export const saleItemInputSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce
    .number()
    .int()
    .positive()
    .max(MAX_INT4, "Quantidade acima do limite permitido"),
});

export const checkoutSchema = z.object({
  items: z.array(saleItemInputSchema).min(1, "Adicione ao menos um item"),
  customerId: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  discountCents: moneySchema.default(0),
  paymentMethod: z.enum(["DINHEIRO", "PIX", "DEBITO", "CREDITO", "OUTRO"]),
  installments: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_INSTALLMENTS, `Use no máximo ${MAX_INSTALLMENTS} parcelas`)
    .default(1),
  notes: optionalText(300),
});

export const cashMovementSchema = z.object({
  type: z.enum(["SANGRIA", "SUPRIMENTO", "ENTRADA", "SAIDA"]),
  amountCents: moneySchema.refine(
    (value) => value > 0,
    "Informe um valor maior que zero",
  ),
  description: optionalText(160),
});

export const financialEntrySchema = z.object({
  kind: z.enum(["RECEBER", "PAGAR"]),
  description: z.string().trim().min(2, "Informe a descrição").max(160),
  category: optionalText(60),
  amountCents: moneySchema.refine(
    (value) => value > 0,
    "Informe um valor maior que zero",
  ),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  paymentMethod: z
    .enum(["DINHEIRO", "PIX", "DEBITO", "CREDITO", "OUTRO"])
    .optional(),
  notes: optionalText(300),
});

export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  /**
   * Valores enviados, devolvidos quando o formulário falha. O React 19 limpa os
   * campos não controlados depois de toda submissão; sem este eco o usuário
   * perderia tudo o que digitou para corrigir um único erro.
   */
  values?: Record<string, string>;
};

export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}

export function formToObject(formData: FormData): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) continue;
    if (key in result) {
      const current = result[key];
      result[key] = Array.isArray(current) ? [...current, value] : [current, value];
    } else {
      result[key] = value;
    }
  }
  return result;
}

