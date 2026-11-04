import assert from "node:assert/strict";
import test from "node:test";

/**
 * O checkout é o único ponto em que a loja depende do gateway para faturar.
 * Estes testes cobrem as duas falhas que travavam a contratação: cliente
 * duplicado no Asaas e documento ausente.
 */

type Call = { url: string; method: string; body: unknown };

function stubFetch(routes: (call: Call) => unknown) {
  const calls: Call[] = [];
  const original = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    const call = { url, method, body };
    calls.push(call);
    return new Response(JSON.stringify(routes(call)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  return {
    calls,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

async function provider() {
  process.env.ASAAS_API_KEY = "chave-de-teste";
  process.env.ASAAS_ENV = "sandbox";
  const { asaas } = await import("../src/lib/billing/asaas.ts");
  return asaas();
}

const checkout = {
  customer: {
    name: "Loja Teste",
    email: "loja@exemplo.com",
    document: "529.982.247-25",
    externalReference: "store-1",
  },
  planCode: "ESSENCIAL",
  planName: "Essencial",
  interval: "MONTHLY" as const,
  amountCents: 1990,
  nextDueDate: "2026-11-04",
  description: "Store77 · plano Essencial (mensal)",
  externalReference: "store-1",
};

test("checkout reaproveita o cliente já cadastrado pelo CPF/CNPJ", async () => {
  const stub = stubFetch(({ url, method }) => {
    if (method === "GET" && url.includes("/customers?cpfCnpj=")) {
      return { data: [{ id: "cus_existente" }] };
    }
    if (method === "POST" && url.endsWith("/subscriptions")) {
      return { id: "sub_1" };
    }
    if (method === "GET" && url.endsWith("/subscriptions/sub_1/payments")) {
      return { data: [{ id: "pay_1", invoiceUrl: "https://asaas.com/i/pay_1" }] };
    }
    throw new Error(`chamada inesperada: ${method} ${url}`);
  });

  try {
    const asaas = await provider();
    const result = await asaas.createCheckout(checkout);

    assert.equal(result.providerCustomerId, "cus_existente");
    assert.equal(result.providerSubscriptionId, "sub_1");
    assert.equal(result.checkoutUrl, "https://asaas.com/i/pay_1");

    // O cadastro duplicado é o que fazia a segunda tentativa falhar para sempre.
    assert.equal(
      stub.calls.filter((call) => call.method === "POST" && call.url.endsWith("/customers"))
        .length,
      0,
    );
    const subscription = stub.calls.find((call) => call.url.endsWith("/subscriptions"));
    assert.equal((subscription?.body as { customer: string }).customer, "cus_existente");
  } finally {
    stub.restore();
  }
});

test("checkout sem CPF/CNPJ falha antes de qualquer chamada ao gateway", async () => {
  const stub = stubFetch(() => {
    throw new Error("o gateway não deveria ser chamado");
  });

  try {
    const asaas = await provider();
    await assert.rejects(
      asaas.createCheckout({
        ...checkout,
        customer: { ...checkout.customer, document: null },
      }),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.equal((error as { status?: number }).status, 400);
        assert.match(error.message, /CPF ou CNPJ/);
        return true;
      },
    );
    assert.equal(stub.calls.length, 0);
  } finally {
    stub.restore();
  }
});
