import assert from "node:assert/strict";
import test from "node:test";
import {
  cartInstallmentsLimit,
  splitInstallments,
} from "../src/lib/installments.ts";
import { isCreditPayment, saleUnitPriceCents } from "../src/lib/pricing.ts";

const comCredito = { priceCents: 10000, creditPriceCents: 12000 };
const soAVista = { priceCents: 10000, creditPriceCents: null };

test("à vista, dinheiro e pix usam o preço de venda", () => {
  assert.equal(saleUnitPriceCents(comCredito, false), 10000);
});

test("crédito usa o preço cheio cadastrado", () => {
  assert.equal(saleUnitPriceCents(comCredito, true), 12000);
});

test("crédito em produto sem preço cheio cai para o preço à vista", () => {
  assert.equal(saleUnitPriceCents(soAVista, true), 10000);
});

test("preço de crédito zerado não vende de graça", () => {
  assert.equal(saleUnitPriceCents({ priceCents: 10000, creditPriceCents: 0 }, true), 10000);
});

test("só a forma CREDITO paga o preço cheio", () => {
  assert.equal(isCreditPayment("CREDITO"), true);
  assert.equal(isCreditPayment("DEBITO"), false);
  assert.equal(isCreditPayment("DINHEIRO"), false);
});

test("parcelas dividem o total da venda, inclusive com desconto quebrado", () => {
  assert.deepEqual(splitInstallments(10000, 4), {
    count: 4,
    installmentCents: 2500,
    totalCents: 10000,
  });
  assert.equal(splitInstallments(10000, 3)?.installmentCents, 3333);
});

test("total da venda em 1x ou zerado não anuncia parcelas", () => {
  assert.equal(splitInstallments(10000, 1), null);
  assert.equal(splitInstallments(0, 3), null);
});

test("carrinho vazio não anuncia parcelas", () => {
  assert.equal(cartInstallmentsLimit([]), 1);
});

test("vale o parcelamento do item mais restritivo do carrinho", () => {
  assert.equal(cartInstallmentsLimit([3, 12]), 3);
  assert.equal(cartInstallmentsLimit([12]), 12);
});

test("item só à vista derruba o carrinho para 1x", () => {
  assert.equal(cartInstallmentsLimit([12, 1]), 1);
  assert.equal(cartInstallmentsLimit([0, 12]), 1);
});
