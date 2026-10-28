import assert from "node:assert/strict";
import test from "node:test";
import { formatBRL } from "../src/lib/format.ts";
import { installmentLabel, installmentPlan } from "../src/lib/installments.ts";

test("1x não anuncia parcela", () => {
  assert.equal(installmentPlan(10000, 12000, 1), null);
  assert.equal(installmentLabel(null), null);
});

test("sem preço de crédito as parcelas usam o preço à vista", () => {
  assert.deepEqual(installmentPlan(10000, null, 4), {
    count: 4,
    installmentCents: 2500,
    totalCents: 10000,
    interestFree: true,
  });
});

test("preço de crédito é a base das parcelas", () => {
  assert.deepEqual(installmentPlan(10000, 12000, 3), {
    count: 3,
    installmentCents: 4000,
    totalCents: 12000,
    interestFree: false,
  });
});

test("preço de crédito igual ao à vista continua sem juros", () => {
  assert.equal(installmentPlan(10000, 10000, 3)?.interestFree, true);
});

test("divisão quebrada arredonda a parcela para o centavo mais próximo", () => {
  const plan = installmentPlan(10000, null, 3);
  assert.equal(plan?.installmentCents, 3333);
  assert.equal(installmentLabel(plan), `ou 3x de ${formatBRL(3333)} sem juros`);
});

test("produto sem preço não anuncia parcelas", () => {
  assert.equal(installmentPlan(0, null, 3), null);
  assert.equal(installmentPlan(0, 0, 12), null);
});

test("parcelas inválidas são ignoradas em vez de quebrar a vitrine", () => {
  assert.equal(installmentPlan(10000, null, Number.NaN), null);
  assert.equal(installmentPlan(10000, null, 0), null);
  assert.equal(installmentPlan(10000, null, -3), null);
});

test("preço de crédito zerado cai para o preço à vista", () => {
  assert.equal(installmentPlan(5000, 0, 2)?.totalCents, 5000);
});

test("rótulo no formato das lojas brasileiras quando não há juro", () => {
  assert.equal(
    installmentLabel(installmentPlan(19990, null, 12)),
    `ou 12x de ${formatBRL(1666)} sem juros`,
  );
});

test("preço de crédito maior tira o “sem juros” do anúncio", () => {
  const plan = installmentPlan(19990, 23900, 12);
  assert.equal(installmentLabel(plan), `ou 12x de ${formatBRL(1992)}`);
  assert.equal(installmentLabel(plan)?.includes("sem juros"), false);
});
