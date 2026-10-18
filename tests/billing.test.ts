import assert from "node:assert/strict";
import test from "node:test";
import { asaas } from "../src/lib/billing/asaas.ts";
import { resolveAccess, type AccessSubscription } from "../src/lib/billing/access.ts";
import {
  ADDONS,
  PUBLIC_PLANS,
  annualFromMonthly,
  findPlan,
  limitsFor,
  monthlyEquivalentCents,
  periodTotalCents,
  SEAT_ROLES,
} from "../src/lib/billing/plans.ts";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-10-18T12:00:00Z");
const daysFromNow = (days: number) => new Date(NOW.getTime() + days * DAY);

function subscription(
  overrides: Partial<AccessSubscription> = {},
): AccessSubscription {
  return {
    status: "ACTIVE",
    billingMode: "PROVIDER",
    grantType: "PAID",
    trialEndsAt: null,
    currentPeriodEnd: daysFromNow(10),
    grantExpiresAt: null,
    revokedAt: null,
    cancelAtPeriodEnd: false,
    excludeFromMetrics: false,
    ...overrides,
  };
}

test("o Essencial é a âncora de R$ 19,90", () => {
  assert.equal(findPlan("ESSENCIAL")?.monthlyCents, 1990);
});

test("os planos públicos mantêm a proporção do Essencial", () => {
  const base = findPlan("ESSENCIAL")!.monthlyCents;
  const ratios = PUBLIC_PLANS.map((plan) => plan.monthlyCents / base);
  // O arredondamento comercial é para o preço terminado em ,90.
  assert.deepEqual(
    ratios.map((ratio) => Math.round(ratio * 100) / 100),
    [1, 2.01, 4.02, 7.03, 13.56],
  );
});

test("o anual é 20% mais barato que 12 mensalidades", () => {
  for (const plan of PUBLIC_PLANS) {
    const fullYear = plan.monthlyCents * 12;
    assert.equal(plan.annualCents, annualFromMonthly(plan.monthlyCents));
    assert.ok(plan.annualCents < fullYear, `${plan.code} sem desconto`);
    assert.ok(
      plan.annualCents >= fullYear * 0.79,
      `${plan.code} com desconto acima de 21%`,
    );
  }
});

test("a escada de assentos cresce e o preço por usuário cai", () => {
  const seats = PUBLIC_PLANS.map((plan) => plan.includedSeats);
  assert.deepEqual(seats, [1, 3, 8, 20, 50]);

  const perSeat = PUBLIC_PLANS.map((plan) =>
    Math.round(plan.monthlyCents / plan.includedSeats),
  );
  for (let i = 1; i < perSeat.length; i += 1) {
    assert.ok(
      perSeat[i] < perSeat[i - 1],
      `${PUBLIC_PLANS[i].code} não é mais barato por usuário que o anterior`,
    );
  }
});

test("o assento avulso fica entre o plano de entrada e o preço de volume", () => {
  const essencial = PUBLIC_PLANS[0];
  const loja = PUBLIC_PLANS[1];
  const top = PUBLIC_PLANS[PUBLIC_PLANS.length - 1];

  // Um assento nunca custa mais que um plano inteiro de entrada...
  assert.ok(ADDONS.seat.monthlyCents <= essencial.monthlyCents);
  // ...nem sai mais barato que o preço por usuário do plano de volume, o que
  // permitiria remontar o Corporativo empilhando adicionais.
  assert.ok(
    ADDONS.seat.monthlyCents >= top.monthlyCents / top.includedSeats,
  );
  // A primeira pessoa extra ainda sai mais barata que subir para o Loja.
  assert.ok(
    essencial.monthlyCents + ADDONS.seat.monthlyCents < loja.monthlyCents,
  );
});

test("o Essencial é de um assento: só o proprietário", () => {
  const essencial = findPlan("ESSENCIAL")!;
  assert.equal(essencial.includedSeats, 1);
  assert.equal(findPlan("LOJA")!.includedSeats, 3);
});

test("adicionais somam ao plano e ao anual", () => {
  const essencial = findPlan("ESSENCIAL")!;
  const addons = { extraSeats: 2, extraStores: 1, extraSalesPacks: 1 };

  assert.equal(
    periodTotalCents(essencial, addons, "MONTHLY"),
    1990 +
      2 * ADDONS.seat.monthlyCents +
      ADDONS.store.monthlyCents +
      ADDONS.salesPack.monthlyCents,
  );
  assert.equal(limitsFor(essencial, addons).seats, essencial.includedSeats + 2);
  assert.equal(
    limitsFor(essencial, addons).salesPerMonth,
    essencial.includedSalesPerMonth + ADDONS.salesPack.sales,
  );
  assert.ok(
    periodTotalCents(essencial, addons, "YEARLY") <
      periodTotalCents(essencial, addons, "MONTHLY") * 12,
  );
  assert.equal(
    monthlyEquivalentCents(essencial, addons, "YEARLY"),
    Math.round(periodTotalCents(essencial, addons, "YEARLY") / 12),
  );
});

test("cliente da vitrine não ocupa assento", () => {
  assert.ok(!(SEAT_ROLES as readonly string[]).includes("CLIENTE"));
  assert.deepEqual([...SEAT_ROLES], ["OWNER", "GERENTE", "VENDEDOR", "CAIXA"]);
});

test("teste em andamento tem acesso completo", () => {
  const access = resolveAccess(
    subscription({
      status: "TRIALING",
      grantType: "TRIAL",
      trialEndsAt: daysFromNow(5),
      currentPeriodEnd: daysFromNow(5),
    }),
    NOW,
  );
  assert.equal(access.state, "TRIALING");
  assert.equal(access.capabilities.manageFinance, true);
});

test("até 7 dias de atraso o acesso é completo", () => {
  const access = resolveAccess(
    subscription({ currentPeriodEnd: daysFromNow(-6) }),
    NOW,
  );
  assert.equal(access.state, "PAST_DUE");
  assert.equal(access.daysLate, 6);
  assert.equal(access.capabilities.usePos, true);
  assert.equal(access.capabilities.manageTeam, true);
});

test("entre 7 e 30 dias só o PDV e a vitrine funcionam", () => {
  const access = resolveAccess(
    subscription({ currentPeriodEnd: daysFromNow(-10) }),
    NOW,
  );
  assert.equal(access.state, "RESTRICTED");
  assert.equal(access.capabilities.usePos, true);
  assert.equal(access.capabilities.publishStorefront, true);
  assert.equal(access.capabilities.writeCatalog, false);
  assert.equal(access.capabilities.manageFinance, false);
  assert.equal(access.capabilities.inviteUsers, false);
});

test("com 30 dias de atraso a loja é suspensa", () => {
  const access = resolveAccess(
    subscription({ currentPeriodEnd: daysFromNow(-30) }),
    NOW,
  );
  assert.equal(access.state, "SUSPENDED");
  assert.equal(access.capabilities.usePos, false);
  assert.equal(access.capabilities.exportData, true);
  assert.equal(access.capabilities.publishStorefront, false);
});

test("cortesia vitalícia não vence", () => {
  const farFuture = resolveAccess(
    subscription({
      billingMode: "COMPLIMENTARY",
      grantType: "GIFT",
      currentPeriodEnd: null,
      grantExpiresAt: null,
    }),
    new Date("2099-01-01T00:00:00Z"),
  );
  assert.equal(farFuture.state, "ACTIVE");
  assert.equal(farFuture.isLifetime, true);
  assert.equal(farFuture.capabilities.manageTeam, true);
});

test("cortesia temporária segue os mesmos prazos da assinatura", () => {
  const access = resolveAccess(
    subscription({
      billingMode: "COMPLIMENTARY",
      grantType: "PROMO",
      currentPeriodEnd: null,
      grantExpiresAt: daysFromNow(-8),
    }),
    NOW,
  );
  assert.equal(access.state, "RESTRICTED");
  assert.equal(access.isComplimentary, true);
});

test("cortesia revogada corta o acesso na hora", () => {
  const access = resolveAccess(
    subscription({
      billingMode: "COMPLIMENTARY",
      grantType: "GIFT",
      currentPeriodEnd: null,
      revokedAt: NOW,
    }),
    NOW,
  );
  assert.equal(access.state, "SUSPENDED");
  assert.equal(access.capabilities.usePos, false);
});

test("cancelamento mantém o acesso até o fim do período pago", () => {
  const during = resolveAccess(
    subscription({
      status: "CANCELED",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: daysFromNow(3),
    }),
    NOW,
  );
  assert.equal(during.state, "ACTIVE");

  const after = resolveAccess(
    subscription({
      status: "CANCELED",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: daysFromNow(-1),
    }),
    NOW,
  );
  assert.equal(after.state, "CANCELED");
  assert.equal(after.capabilities.usePos, false);
});

test("assinatura sem data de renovação não bloqueia uma loja pagante", () => {
  const access = resolveAccess(subscription({ currentPeriodEnd: null }), NOW);
  assert.equal(access.state, "ACTIVE");
  assert.equal(access.capabilities.writeCatalog, true);
});

/* ------------------------------------------------------------------------- *
 * Tradução de webhook do Asaas
 * ------------------------------------------------------------------------- */

test("SUBSCRIPTION_UPDATED não cancela a assinatura", () => {
  // Nosso próprio PUT (troca de plano, adicionais) gera este evento. Se ele
  // fosse lido como cancelamento, o ajuste derrubava a assinatura local.
  const events = asaas().parseWebhook({
    event: "SUBSCRIPTION_UPDATED",
    subscription: { id: "sub_123" },
  });
  assert.deepEqual(events, []);
});

test("SUBSCRIPTION_DELETED encerra a assinatura", () => {
  const [event] = asaas().parseWebhook({
    event: "SUBSCRIPTION_DELETED",
    subscription: { id: "sub_123" },
  });
  assert.equal(event.kind, "subscription.canceled");
  assert.equal(event.providerSubscriptionId, "sub_123");
});

test("pagamento confirmado vira fatura paga com a data do pagamento", () => {
  const [event] = asaas().parseWebhook({
    event: "PAYMENT_CONFIRMED",
    payment: {
      id: "pay_1",
      subscription: "sub_123",
      customer: "cus_1",
      value: 39.9,
      dueDate: "2026-11-18",
      paymentDate: "2026-11-17",
      billingType: "PIX",
      invoiceUrl: "https://asaas.com/i/pay_1",
      externalReference: "loja-abc",
    },
  });
  assert.equal(event.kind, "invoice.paid");
  assert.equal(event.amountCents, 3990);
  assert.equal(event.dueDate, "2026-11-18");
  assert.equal(event.externalId, "PAYMENT_CONFIRMED:pay_1");
  assert.equal(event.paidAt.toISOString().slice(0, 10), "2026-11-17");
});

test("o mesmo evento entregue duas vezes tem a mesma chave", () => {
  const body = {
    event: "PAYMENT_RECEIVED",
    payment: { id: "pay_9", value: 19.9, dueDate: "2026-11-18" },
  };
  const first = asaas().parseWebhook(body)[0];
  const second = asaas().parseWebhook(body)[0];
  assert.equal(first.externalId, second.externalId);
});

test("evento de pagamento desconhecido é ignorado", () => {
  assert.deepEqual(
    asaas().parseWebhook({ event: "PAYMENT_AWAITING_RISK_ANALYSIS", payment: { id: "pay_2" } }),
    [],
  );
});
