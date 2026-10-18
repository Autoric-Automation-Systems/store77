/**
 * Validação de CPF e CNPJ pelo dígito verificador.
 *
 * Guardamos o documento do afiliado porque ele é a contraparte do repasse por
 * Pix. O dígito verificador evita o erro de digitação que só apareceria na hora
 * de pagar, quando o afiliado já indicou lojas.
 */

/** Só os dígitos, para comparar e gravar sempre no mesmo formato. */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function allSameDigit(digits: string): boolean {
  return /^(\d)\1*$/.test(digits);
}

function cpfCheckDigit(digits: string, length: number): number {
  let sum = 0;
  for (let index = 0; index < length; index += 1) {
    sum += Number(digits[index]) * (length + 1 - index);
  }
  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
}

function cnpjCheckDigit(digits: string, length: number): number {
  const weights =
    length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let index = 0; index < length; index += 1) {
    sum += Number(digits[index]) * weights[index];
  }
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

export function isValidCpf(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 11 || allSameDigit(digits)) return false;
  return (
    cpfCheckDigit(digits, 9) === Number(digits[9]) &&
    cpfCheckDigit(digits, 10) === Number(digits[10])
  );
}

export function isValidCnpj(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 14 || allSameDigit(digits)) return false;
  return (
    cnpjCheckDigit(digits, 12) === Number(digits[12]) &&
    cnpjCheckDigit(digits, 13) === Number(digits[13])
  );
}

export function isValidDocument(value: string): boolean {
  const digits = onlyDigits(value);
  return digits.length === 14 ? isValidCnpj(digits) : isValidCpf(digits);
}

/** 12345678901 -> 123.456.789-01 | 11222333000181 -> 11.222.333/0001-81 */
export function formatDocument(value: string): string {
  const digits = onlyDigits(value);
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (digits.length === 14) {
    return digits.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5",
    );
  }
  return value;
}
