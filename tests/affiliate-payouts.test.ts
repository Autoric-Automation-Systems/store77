import assert from "node:assert/strict";
import test from "node:test";
import { normalizePixKey, pixKeyTypeOf } from "../src/lib/pix.ts";

test("chave com @ é e-mail", () => {
  assert.equal(pixKeyTypeOf("marina@exemplo.com.br"), "EMAIL");
});

test("chave igual ao CPF do cadastro é CPF", () => {
  assert.equal(pixKeyTypeOf("529.982.247-25", "52998224725"), "CPF");
});

test("11 dígitos diferentes do documento são telefone", () => {
  assert.equal(pixKeyTypeOf("47999998888", "52998224725"), "PHONE");
});

test("14 dígitos são CNPJ", () => {
  assert.equal(pixKeyTypeOf("12.345.678/0001-95"), "CNPJ");
});

test("chave aleatória cai em EVP", () => {
  assert.equal(
    pixKeyTypeOf("8f14e45f-ceea-467f-a4d2-9bb1c1e2a111"),
    "EVP",
  );
});

test("telefone com DDI perde o +55 antes de ir para o gateway", () => {
  assert.equal(normalizePixKey("+55 (47) 99999-8888", "PHONE"), "47999998888");
});

test("CPF e CNPJ vão sem pontuação", () => {
  assert.equal(normalizePixKey("529.982.247-25", "CPF"), "52998224725");
  assert.equal(normalizePixKey("12.345.678/0001-95", "CNPJ"), "12345678000195");
});

test("e-mail e EVP são preservados", () => {
  assert.equal(normalizePixKey(" marina@exemplo.com ", "EMAIL"), "marina@exemplo.com");
  assert.equal(
    normalizePixKey("8f14e45f-ceea-467f-a4d2-9bb1c1e2a111", "EVP"),
    "8f14e45f-ceea-467f-a4d2-9bb1c1e2a111",
  );
});

test("afiliado do Asaas exige chave classificada entre os cinco tipos", () => {
  const keys = [
    "marina@exemplo.com",
    "529.982.247-25",
    "12.345.678/0001-95",
    "47999998888",
    "8f14e45f-ceea-467f-a4d2-9bb1c1e2a111",
  ];
  const types = keys.map((key) => pixKeyTypeOf(key, "52998224725"));
  assert.deepEqual(types, ["EMAIL", "CPF", "CNPJ", "PHONE", "EVP"]);
});
