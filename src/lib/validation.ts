import { z } from "zod";
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

export const moneySchema = z
  .union([z.string(), z.number()])
  .transform((value) => parseMoneyToCents(value as string | number));

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
  password: passwordSchema,
  acceptTerms: booleanField.refine(
    (value) => value === true,
    "É preciso aceitar os Termos de Uso e a Política de Privacidade",
  ),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe a senha"),
});

export const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Informe o nome").max(80),
  kind: z.enum(["TIPO", "NICHO"]).default("TIPO"),
  description: optionalText(240),
});

export const productSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().trim().min(1, "Informe o código").max(40),
  name: z.string().trim().min(2, "Informe a descrição").max(160),
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
  quantity: z.coerce.number().int().min(0, "Quantidade não pode ser negativa"),
  minQuantity: z.coerce.number().int().min(0).default(0),
  location: optionalText(120),
  active: booleanField.default(true),
  images: z.array(z.string().trim().min(1)).max(8).default([]),
});

export const stockMovementSchema = z.object({
  productId: z.string().uuid("Selecione um produto"),
  type: z.enum(["ENTRADA", "SAIDA", "AJUSTE"]),
  quantity: z.coerce.number().int().positive("Informe uma quantidade maior que zero"),
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
  whatsapp: optionalText(40),
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
  password: passwordSchema,
  role: z.enum(["GERENTE", "VENDEDOR", "CLIENTE"]),
});

export const saleItemInputSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
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
  notes: optionalText(300),
});

export const cashMovementSchema = z.object({
  type: z.enum(["SANGRIA", "SUPRIMENTO", "ENTRADA", "SAIDA"]),
  amountCents: moneySchema.refine((value) => value > 0, "Informe um valor"),
  description: optionalText(160),
});

export const financialEntrySchema = z.object({
  kind: z.enum(["RECEBER", "PAGAR"]),
  description: z.string().trim().min(2, "Informe a descrição").max(160),
  category: optionalText(60),
  amountCents: moneySchema.refine((value) => value > 0, "Informe um valor"),
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

