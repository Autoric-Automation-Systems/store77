/**
 * Contrato mínimo de cobrança recorrente.
 *
 * A regra de negócio (planos, limites, comissão, acesso) fica no domínio; o
 * provider só move dinheiro e traduz webhooks. Assim trocar Asaas por outro
 * gateway não reescreve preço nem permissão.
 */

export type BillingIntervalName = "MONTHLY" | "YEARLY";

export type CustomerInput = {
  name: string;
  email: string;
  document?: string | null;
  /** Sempre o id da loja: é como o webhook encontra o tenant. */
  externalReference: string;
};

export type CheckoutInput = {
  customer: CustomerInput;
  planCode: string;
  planName: string;
  interval: BillingIntervalName;
  amountCents: number;
  /** Primeiro vencimento, `YYYY-MM-DD`. */
  nextDueDate: string;
  description: string;
  externalReference: string;
};

export type CheckoutResult = {
  providerCustomerId: string;
  providerSubscriptionId: string;
  /** Página de pagamento da primeira fatura. `null` se o gateway ainda não gerou. */
  checkoutUrl: string | null;
};

export type ProviderEvent =
  | {
      kind: "invoice.paid";
      externalId: string;
      providerInvoiceId: string;
      providerSubscriptionId: string | null;
      providerCustomerId: string | null;
      externalReference: string | null;
      amountCents: number;
      paidAt: Date;
      dueDate: string;
      billingType: string | null;
      invoiceUrl: string | null;
      raw: unknown;
    }
  | {
      kind: "invoice.overdue";
      externalId: string;
      providerInvoiceId: string;
      providerSubscriptionId: string | null;
      providerCustomerId: string | null;
      externalReference: string | null;
      amountCents: number;
      dueDate: string;
      raw: unknown;
    }
  | {
      kind: "invoice.refunded" | "invoice.canceled";
      externalId: string;
      providerInvoiceId: string;
      providerSubscriptionId: string | null;
      providerCustomerId: string | null;
      externalReference: string | null;
      amountCents: number;
      raw: unknown;
    }
  | {
      kind: "subscription.canceled";
      externalId: string;
      providerSubscriptionId: string;
      raw: unknown;
    }
  | {
      kind: "transfer.done" | "transfer.failed";
      externalId: string;
      providerTransferId: string;
      externalReference: string | null;
      status: string;
      raw: unknown;
    };

export type PixKeyType = "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "EVP";

export type TransferInput = {
  amountCents: number;
  pixAddressKey: string;
  pixAddressKeyType: PixKeyType;
  description: string;
  /** Id do repasse: permite reconciliar o webhook e evita envio duplo. */
  externalReference: string;
};

export type TransferResult = {
  providerTransferId: string;
  status: string;
  endToEndId: string | null;
};

export interface BillingProvider {
  readonly name: "ASAAS" | "STRIPE";
  readonly isConfigured: boolean;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  cancelSubscription(providerSubscriptionId: string): Promise<void>;
  updateSubscriptionValue(
    providerSubscriptionId: string,
    amountCents: number,
    interval: BillingIntervalName,
  ): Promise<void>;
  createTransfer(input: TransferInput): Promise<TransferResult>;
  /** `false` = assinatura inexistente no gateway (já cancelada, por exemplo). */
  verifyWebhookToken(token: string | null): boolean;
  parseWebhook(body: unknown): ProviderEvent[];
}
