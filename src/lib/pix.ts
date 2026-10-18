import type { PixKeyType } from "./billing/provider";

/**
 * O afiliado informa só a chave; o Asaas exige o tipo. Fica separado do
 * domínio de repasse porque é regra de formato, testável sem banco.
 */

/**
 * CPF e telefone têm 11 dígitos, então o desempate é o documento do cadastro:
 * chave igual ao documento é CPF; 11 dígitos diferentes dele são telefone.
 */
export function pixKeyTypeOf(
  key: string,
  document?: string | null,
): PixKeyType {
  const trimmed = key.trim();
  if (trimmed.includes("@")) return "EMAIL";

  const digits = trimmed.replace(/\D/g, "");
  const documentDigits = document?.replace(/\D/g, "") ?? "";
  if (digits.length === 11 && digits === documentDigits) return "CPF";
  if (digits.length === 14) return "CNPJ";
  // 13 dígitos é telefone com DDI (+55); o Asaas quer 11, com DDD.
  if (digits.length === 11 || digits.length === 13) return "PHONE";

  return "EVP";
}

export function normalizePixKey(key: string, type: PixKeyType): string {
  const trimmed = key.trim();
  if (type === "EMAIL" || type === "EVP") return trimmed;

  const digits = trimmed.replace(/\D/g, "");
  if (type === "PHONE" && digits.length === 13 && digits.startsWith("55")) {
    return digits.slice(2);
  }
  return digits;
}
