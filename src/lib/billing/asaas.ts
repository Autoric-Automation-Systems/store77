import type {
  BillingIntervalName,
  BillingProvider,
  CheckoutInput,
  CheckoutResult,
  ProviderEvent,
} from "./provider";

/**
 * Adapter do Asaas (API v3).
 *
 * Sem `ASAAS_API_KEY` o provider fica desligado e a tela de assinatura explica
 * que a contratação online ainda não está disponível — nada quebra.
 */

export class AsaasError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    const detail =
      typeof body === "object" && body && "errors" in body
        ? JSON.stringify((body as { errors: unknown }).errors)
        : String(body);
    super(`Asaas ${status}: ${detail}`);
    this.name = "AsaasError";
    this.status = status;
    this.body = body;
  }
}

type AsaasPayment = {
  id: string;
  subscription?: string | null;
  customer?: string | null;
  value?: number;
  dueDate?: string;
  paymentDate?: string | null;
  clientPaymentDate?: string | null;
  billingType?: string | null;
  invoiceUrl?: string | null;
  externalReference?: string | null;
};

type AsaasWebhook = {
  event?: string;
  payment?: AsaasPayment;
  subscription?: { id?: string; externalReference?: string | null };
};

const PAID_EVENTS = new Set([
  "PAYMENT_CONFIRMED",
  "PAYMENT_RECEIVED",
  "PAYMENT_RECEIVED_IN_CASH",
]);

const OVERDUE_EVENTS = new Set(["PAYMENT_OVERDUE"]);

const CANCELED_SUBSCRIPTION_EVENTS = new Set([
  "SUBSCRIPTION_DELETED",
  "SUBSCRIPTION_INACTIVATED",
]);

const REVERSED_EVENTS = new Set([
  "PAYMENT_REFUNDED",
  "PAYMENT_PARTIALLY_REFUNDED",
  "PAYMENT_CHARGEBACK_REQUESTED",
  "PAYMENT_CHARGEBACK_DISPUTE",
  "PAYMENT_AWAITING_CHARGEBACK_REVERSAL",
  "PAYMENT_DELETED",
]);

function toCents(value: number | string | undefined): number {
  if (value === undefined || value === null) return 0;
  return Math.round(Number(value) * 100);
}

function onlyDigits(value: string | null | undefined): string | undefined {
  const digits = value?.replace(/\D/g, "");
  return digits && digits.length >= 11 ? digits : undefined;
}

class AsaasProvider implements BillingProvider {
  readonly name = "ASAAS" as const;
  private readonly apiKey: string | null;
  private readonly webhookToken: string | null;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = process.env.ASAAS_API_KEY?.trim() || null;
    this.webhookToken = process.env.ASAAS_WEBHOOK_TOKEN?.trim() || null;
    this.baseUrl =
      process.env.ASAAS_ENV === "production"
        ? "https://api.asaas.com/v3"
        : "https://api-sandbox.asaas.com/v3";
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  get hasWebhookToken(): boolean {
    return Boolean(this.webhookToken);
  }

  private async request<T>(
    path: string,
    init: { method?: string; body?: unknown } = {},
  ): Promise<T> {
    if (!this.apiKey) throw new AsaasError(503, "ASAAS_API_KEY não configurada");

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: init.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        access_token: this.apiKey,
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });

    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;
    if (!response.ok) throw new AsaasError(response.status, payload);
    return payload as T;
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const customer = await this.request<{ id: string }>("/customers", {
      method: "POST",
      body: {
        name: input.customer.name,
        email: input.customer.email,
        cpfCnpj: onlyDigits(input.customer.document),
        externalReference: input.customer.externalReference,
        notificationDisabled: false,
      },
    });

    const subscription = await this.request<{ id: string }>("/subscriptions", {
      method: "POST",
      body: {
        customer: customer.id,
        // `UNDEFINED` deixa o cliente escolher Pix, boleto ou cartão na fatura.
        billingType: "UNDEFINED",
        value: input.amountCents / 100,
        nextDueDate: input.nextDueDate,
        cycle: input.interval,
        description: input.description,
        externalReference: input.externalReference,
      },
    });

    // A assinatura cria a primeira cobrança de forma assíncrona no Asaas.
    // Se ela ainda não existir, a próxima tentativa de pagamento aparece na
    // tela de assinatura; o checkout não precisa falhar por isso.
    let checkoutUrl: string | null = null;
    try {
      const payments = await this.request<{ data: AsaasPayment[] }>(
        `/subscriptions/${subscription.id}/payments`,
      );
      checkoutUrl = payments.data?.[0]?.invoiceUrl ?? null;
    } catch {
      checkoutUrl = null;
    }

    return {
      providerCustomerId: customer.id,
      providerSubscriptionId: subscription.id,
      checkoutUrl,
    };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    try {
      await this.request(`/subscriptions/${providerSubscriptionId}`, {
        method: "DELETE",
      });
    } catch (error) {
      // 404 = já não existe no gateway; o estado local ainda precisa mudar.
      if (error instanceof AsaasError && error.status === 404) return;
      throw error;
    }
  }

  async updateSubscriptionValue(
    providerSubscriptionId: string,
    amountCents: number,
    interval: BillingIntervalName,
  ): Promise<void> {
    await this.request(`/subscriptions/${providerSubscriptionId}`, {
      method: "PUT",
      body: {
        value: amountCents / 100,
        cycle: interval,
        updatePendingPayments: true,
      },
    });
  }

  verifyWebhookToken(token: string | null): boolean {
    if (!this.webhookToken) return false;
    return token === this.webhookToken;
  }

  parseWebhook(body: unknown): ProviderEvent[] {
    const payload = body as AsaasWebhook;
    const event = payload?.event;
    if (!event) return [];

    // Só encerramento encerra. O Asaas manda SUBSCRIPTION_UPDATED a cada PUT
    // nosso (troca de plano, adicionais), e tratar isso como cancelamento
    // derrubaria a própria assinatura que acabamos de ajustar.
    if (CANCELED_SUBSCRIPTION_EVENTS.has(event)) {
      const id = payload.subscription?.id;
      if (!id) return [];
      return [
        {
          kind: "subscription.canceled",
          externalId: `${event}:${id}`,
          providerSubscriptionId: id,
          raw: payload,
        },
      ];
    }

    const payment = payload.payment;
    if (!payment?.id) return [];

    const common = {
      externalId: `${event}:${payment.id}`,
      providerInvoiceId: payment.id,
      providerSubscriptionId: payment.subscription ?? null,
      providerCustomerId: payment.customer ?? null,
      externalReference: payment.externalReference ?? null,
      amountCents: toCents(payment.value),
      raw: payload,
    };

    if (PAID_EVENTS.has(event)) {
      const paidAt = payment.paymentDate ?? payment.clientPaymentDate;
      return [
        {
          kind: "invoice.paid",
          ...common,
          paidAt: paidAt ? new Date(`${paidAt}T12:00:00Z`) : new Date(),
          dueDate: payment.dueDate ?? new Date().toISOString().slice(0, 10),
          billingType: payment.billingType ?? null,
          invoiceUrl: payment.invoiceUrl ?? null,
        },
      ];
    }

    if (OVERDUE_EVENTS.has(event)) {
      return [
        {
          kind: "invoice.overdue",
          ...common,
          dueDate: payment.dueDate ?? new Date().toISOString().slice(0, 10),
        },
      ];
    }

    if (REVERSED_EVENTS.has(event)) {
      return [
        {
          kind: event === "PAYMENT_DELETED" ? "invoice.canceled" : "invoice.refunded",
          ...common,
        },
      ];
    }

    return [];
  }
}

let instance: AsaasProvider | undefined;

export function asaas(): AsaasProvider {
  instance ??= new AsaasProvider();
  return instance;
}
