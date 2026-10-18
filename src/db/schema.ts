import { relations, sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Domínio: SaaS de gestão para lojas (estoque, caixa, financeiro e vitrine).
 * Toda entidade de negócio carrega `storeId` (isolamento multi-tenant).
 * Valores monetários são inteiros em centavos para evitar erro de arredondamento.
 */

export const userRole = pgEnum("user_role", [
  "OWNER",
  "GERENTE",
  "VENDEDOR",
  "CAIXA",
  "CLIENTE",
]);

export const movementType = pgEnum("movement_type", [
  "ENTRADA",
  "SAIDA",
  "AJUSTE",
]);

export const saleStatus = pgEnum("sale_status", ["ABERTA", "PAGA", "CANCELADA"]);

export const paymentMethod = pgEnum("payment_method", [
  "DINHEIRO",
  "PIX",
  "DEBITO",
  "CREDITO",
  "OUTRO",
]);

export const cashSessionStatus = pgEnum("cash_session_status", [
  "ABERTO",
  "FECHADO",
]);

export const cashMovementType = pgEnum("cash_movement_type", [
  "ENTRADA",
  "SAIDA",
  "SANGRIA",
  "SUPRIMENTO",
]);

export const authTokenType = pgEnum("auth_token_type", [
  "SET_PASSWORD",
  "RESET_PASSWORD",
]);

export const financialKind = pgEnum("financial_kind", ["RECEBER", "PAGAR"]);

export const financialStatus = pgEnum("financial_status", [
  "PENDENTE",
  "PAGO",
  "CANCELADO",
]);

/**
 * Cobrança do próprio SaaS (assinatura da loja), separada do financeiro da loja.
 * `status` é o último estado conhecido; o acesso efetivo é derivado em
 * `lib/billing/access.ts` a partir das datas, para que um webhook perdido não
 * libere nem bloqueie ninguém por engano.
 */
export const subscriptionStatus = pgEnum("subscription_status", [
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "RESTRICTED",
  "SUSPENDED",
  "CANCELED",
]);

export const billingInterval = pgEnum("billing_interval", ["MONTHLY", "YEARLY"]);

/**
 * `PROVIDER` = cobrança recorrente no gateway.
 * `COMPLIMENTARY` = cortesia concedida pelo time (presente, parceria, uso interno).
 */
export const billingMode = pgEnum("billing_mode", ["PROVIDER", "COMPLIMENTARY"]);

export const grantType = pgEnum("grant_type", [
  "PAID",
  "TRIAL",
  "GIFT",
  "INTERNAL",
  "LEGACY",
  "PROMO",
]);

export const billingProviderName = pgEnum("billing_provider_name", [
  "ASAAS",
  "STRIPE",
  "MANUAL",
]);

export const invoiceStatus = pgEnum("invoice_status", [
  "PENDENTE",
  "PAGA",
  "VENCIDA",
  "CANCELADA",
  "ESTORNADA",
]);

export const affiliateStatus = pgEnum("affiliate_status", [
  "PENDENTE",
  "ATIVO",
  "SUSPENSO",
  "RECUSADO",
]);

export const commissionStatus = pgEnum("commission_status", [
  "PENDENTE",
  "DISPONIVEL",
  "PAGO",
  "ESTORNADO",
]);

export const payoutStatus = pgEnum("payout_status", [
  "PENDENTE",
  "PAGO",
  "CANCELADO",
]);

export const discountType = pgEnum("discount_type", ["PERCENT", "AMOUNT"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

export const stores = pgTable(
  "stores",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    legalName: text("legal_name"),
    document: text("document"),
    email: text("email"),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    address: text("address"),

    // Identidade visual da landing page automática
    logoUrl: text("logo_url"),
    heroTitle: text("hero_title"),
    heroSubtitle: text("hero_subtitle"),
    heroImageUrl: text("hero_image_url"),
    aboutText: text("about_text"),
    primaryColor: text("primary_color").notNull().default("#4f46e5"),
    secondaryColor: text("secondary_color").notNull().default("#0f172a"),
    accentColor: text("accent_color").notNull().default("#f59e0b"),

    isPublic: boolean("is_public").notNull().default(true),
    showOutOfStock: boolean("show_out_of_stock").notNull().default(false),

    ...timestamps,
  },
  (table) => [uniqueIndex("stores_slug_key").on(table.slug)],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    // Nulo enquanto o usuário ainda não criou a senha pelo link enviado por e-mail.
    passwordHash: text("password_hash"),
    role: userRole("role").notNull().default("VENDEDOR"),
    phone: text("phone"),
    active: boolean("active").notNull().default(true),
    // Prova de que o e-mail pertence à pessoa: criado/reativado ao definir a senha.
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    // Prova de aceite dos Termos de Uso e da Política de Privacidade.
    termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
    // Último login bem-sucedido. Serve para sugerir redução de plano, nunca
    // para cobrar: assento é usuário ativo alocado, não usuário que entrou.
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("users_email_key").on(sql`lower(${table.email})`),
    index("users_store_idx").on(table.storeId),
  ],
);

export const authTokens = pgTable(
  "auth_tokens",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: authTokenType("type").notNull(),
    // Só o hash SHA-256 fica no banco; o token em claro existe apenas no link.
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("auth_tokens_hash_key").on(table.tokenHash),
    index("auth_tokens_user_idx").on(table.userId, table.type),
  ],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    // "TIPO" = natureza do produto, "NICHO" = segmento da loja
    kind: text("kind").notNull().default("TIPO"),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("categories_store_slug_key").on(table.storeId, table.slug),
    index("categories_store_idx").on(table.storeId),
  ],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    barcode: text("barcode"),
    unit: text("unit").notNull().default("UN"),
    priceCents: integer("price_cents").notNull().default(0),
    costCents: integer("cost_cents").notNull().default(0),
    quantity: integer("quantity").notNull().default(0),
    minQuantity: integer("min_quantity").notNull().default(0),
    location: text("location"),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("products_store_code_key").on(table.storeId, table.code),
    index("products_store_idx").on(table.storeId),
    index("products_category_idx").on(table.categoryId),
  ],
);

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("product_images_product_idx").on(table.productId)],
);

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    // `created_at` empata quando vários lançamentos entram na mesma transação
    // (venda, seed). A sequência dá a ordem real da escrita do razão.
    seq: bigserial("seq", { mode: "number" }).notNull(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    type: movementType("type").notNull(),
    quantity: integer("quantity").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    unitCostCents: integer("unit_cost_cents"),
    reason: text("reason"),
    reference: text("reference"),
    saleId: uuid("sale_id"),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("stock_movements_store_idx").on(table.storeId, table.createdAt),
    index("stock_movements_product_idx").on(table.productId, table.createdAt),
    uniqueIndex("stock_movements_seq_key").on(table.seq),
  ],
);

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    document: text("document"),
    address: text("address"),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [index("customers_store_idx").on(table.storeId)],
);

export const cashSessions = pgTable(
  "cash_sessions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    openedById: uuid("opened_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    openedAt: timestamp("opened_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    openingAmountCents: integer("opening_amount_cents").notNull().default(0),
    closedById: uuid("closed_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    closingAmountCents: integer("closing_amount_cents"),
    status: cashSessionStatus("status").notNull().default("ABERTO"),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [index("cash_sessions_store_idx").on(table.storeId, table.status)],
);

export const sales = pgTable(
  "sales",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    sellerId: uuid("seller_id").references(() => users.id, {
      onDelete: "set null",
    }),
    cashSessionId: uuid("cash_session_id").references(() => cashSessions.id, {
      onDelete: "set null",
    }),
    status: saleStatus("status").notNull().default("ABERTA"),
    subtotalCents: integer("subtotal_cents").notNull().default(0),
    discountCents: integer("discount_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull().default(0),
    paymentMethod: paymentMethod("payment_method"),
    notes: text("notes"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("sales_store_number_key").on(table.storeId, table.number),
    index("sales_store_created_idx").on(table.storeId, table.createdAt),
  ],
);

export const saleItems = pgTable(
  "sale_items",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    saleId: uuid("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    // snapshots: a venda não muda se o cadastro do produto mudar depois
    code: text("code").notNull(),
    name: text("name").notNull(),
    quantity: integer("quantity").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    unitCostCents: integer("unit_cost_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("sale_items_sale_idx").on(table.saleId)],
);

export const cashMovements = pgTable(
  "cash_movements",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    cashSessionId: uuid("cash_session_id")
      .notNull()
      .references(() => cashSessions.id, { onDelete: "cascade" }),
    type: cashMovementType("type").notNull(),
    amountCents: integer("amount_cents").notNull(),
    description: text("description"),
    saleId: uuid("sale_id").references(() => sales.id, {
      onDelete: "set null",
    }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("cash_movements_session_idx").on(table.cashSessionId, table.createdAt),
  ],
);

export const financialEntries = pgTable(
  "financial_entries",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    kind: financialKind("kind").notNull(),
    status: financialStatus("status").notNull().default("PENDENTE"),
    description: text("description").notNull(),
    category: text("category"),
    amountCents: integer("amount_cents").notNull(),
    dueDate: date("due_date").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    paymentMethod: paymentMethod("payment_method"),
    saleId: uuid("sale_id").references(() => sales.id, {
      onDelete: "set null",
    }),
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    createdById: uuid("created_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    index("financial_entries_store_due_idx").on(table.storeId, table.dueDate),
    index("financial_entries_store_status_idx").on(table.storeId, table.status),
  ],
);

/* ------------------------------------------------------------------------- *
 * Assinatura do SaaS
 *
 * O catálogo de planos vive no código (`lib/billing/plans.ts`), não no banco:
 * preço e limite mudam por deploy versionado, e a fatura guarda o valor cobrado
 * como snapshot. Assim não existe o risco de um preço editado no banco divergir
 * do que o app calcula.
 * ------------------------------------------------------------------------- */

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    // Uma assinatura por loja. O histórico de troca fica em `subscription_events`.
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    planCode: text("plan_code").notNull(),
    // Versão do catálogo usada na contratação (ex.: "2026-10").
    priceVersion: text("price_version").notNull(),
    status: subscriptionStatus("status").notNull().default("TRIALING"),
    billingMode: billingMode("billing_mode").notNull().default("PROVIDER"),
    interval: billingInterval("interval").notNull().default("MONTHLY"),

    provider: billingProviderName("provider").notNull().default("MANUAL"),
    providerCustomerId: text("provider_customer_id"),
    providerSubscriptionId: text("provider_subscription_id"),

    // Adicionais somados ao plano: assentos, lojas e pacotes de vendas.
    extraSeats: integer("extra_seats").notNull().default(0),
    extraStores: integer("extra_stores").notNull().default(0),
    extraSalesPacks: integer("extra_sales_packs").notNull().default(0),

    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Nulo em cortesia vitalícia: não existe ciclo a vencer.
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),

    grantType: grantType("grant_type").notNull().default("TRIAL"),
    // Nulo em cortesia vitalícia. Preenchido quando a cortesia tem prazo.
    grantExpiresAt: timestamp("grant_expires_at", { withTimezone: true }),
    grantedByUserId: uuid("granted_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    grantReason: text("grant_reason"),
    // Uso interno (teste, suporte, demonstração): fora de MRR, churn e afiliados.
    excludeFromMetrics: boolean("exclude_from_metrics").notNull().default(false),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokeReason: text("revoke_reason"),

    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),

    ...timestamps,
  },
  (table) => [
    uniqueIndex("subscriptions_store_key").on(table.storeId),
    index("subscriptions_status_idx").on(table.status),
    index("subscriptions_provider_sub_idx").on(table.providerSubscriptionId),
  ],
);

/** Trilha de auditoria: toda mudança de plano, estado ou cortesia entra aqui. */
export const subscriptionEvents = pgTable(
  "subscription_events",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status"),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    detail: jsonb("detail"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("subscription_events_store_idx").on(table.storeId, table.createdAt),
    index("subscription_events_sub_idx").on(table.subscriptionId, table.createdAt),
  ],
);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    provider: billingProviderName("provider").notNull().default("MANUAL"),
    providerInvoiceId: text("provider_invoice_id"),
    status: invoiceStatus("status").notNull().default("PENDENTE"),
    description: text("description").notNull(),
    amountCents: integer("amount_cents").notNull(),
    billingType: text("billing_type"),
    dueDate: date("due_date").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    periodStart: timestamp("period_start", { withTimezone: true }),
    periodEnd: timestamp("period_end", { withTimezone: true }),
    invoiceUrl: text("invoice_url"),
    bankSlipUrl: text("bank_slip_url"),
    pixPayload: text("pix_payload"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("invoices_provider_id_key").on(
      table.provider,
      table.providerInvoiceId,
    ),
    index("invoices_store_due_idx").on(table.storeId, table.dueDate),
    index("invoices_sub_idx").on(table.subscriptionId, table.dueDate),
    index("invoices_status_idx").on(table.status),
  ],
);

/**
 * Todo webhook recebido, inclusive os repetidos e os que falharam. A chave
 * (provider, externalId) é o que garante idempotência: o gateway reenvia o
 * mesmo evento até receber 200, e não podemos aplicar a comissão duas vezes.
 */
export const paymentEvents = pgTable(
  "payment_events",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    provider: billingProviderName("provider").notNull(),
    externalId: text("external_id").notNull(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    error: text("error"),
  },
  (table) => [
    uniqueIndex("payment_events_external_key").on(
      table.provider,
      table.externalId,
    ),
    index("payment_events_received_idx").on(table.receivedAt),
  ],
);

/** Quem pode operar o painel interno (cortesias, MRR, afiliados). */
export const platformAdmins = pgTable(
  "platform_admins",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

/* ------------------------------------------------------------------------- *
 * Programa de afiliados
 *
 * Afiliado não é usuário de loja: `users.storeId` é obrigatório e todo o
 * domínio é por loja, então parceiro tem tabela e sessão próprias.
 * ------------------------------------------------------------------------- */

export const affiliates = pgTable(
  "affiliates",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    email: text("email").notNull(),
    document: text("document"),
    pixKey: text("pix_key"),
    code: text("code").notNull(),
    // Afiliado tem login próprio: não é usuário de loja, então a senha vive
    // aqui e a sessão usa cookie separado.
    passwordHash: text("password_hash"),
    status: affiliateStatus("status").notNull().default("PENDENTE"),
    // Basis points: 2500 = 25,00%. Inteiro evita erro de arredondamento.
    commissionRateBp: integer("commission_rate_bp").notNull().default(2500),
    commissionMonths: integer("commission_months").notNull().default(12),
    tier: text("tier").notNull().default("AFILIADO"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("affiliates_code_key").on(table.code),
    uniqueIndex("affiliates_email_key").on(sql`lower(${table.email})`),
  ],
);

export const affiliateReferrals = pgTable(
  "affiliate_referrals",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    affiliateId: uuid("affiliate_id")
      .notNull()
      .references(() => affiliates.id, { onDelete: "cascade" }),
    // Uma loja tem no máximo um afiliado de origem.
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    attributedAt: timestamp("attributed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    convertedAt: timestamp("converted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("affiliate_referrals_store_key").on(table.storeId),
    index("affiliate_referrals_affiliate_idx").on(table.affiliateId),
  ],
);

export const affiliateCommissions = pgTable(
  "affiliate_commissions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    affiliateId: uuid("affiliate_id")
      .notNull()
      .references(() => affiliates.id, { onDelete: "cascade" }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    invoiceId: uuid("invoice_id").references(() => invoices.id, {
      onDelete: "set null",
    }),
    baseAmountCents: integer("base_amount_cents").notNull(),
    rateBp: integer("rate_bp").notNull(),
    amountCents: integer("amount_cents").notNull(),
    status: commissionStatus("status").notNull().default("PENDENTE"),
    availableAt: timestamp("available_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("affiliate_commissions_invoice_key").on(
      table.invoiceId,
      table.affiliateId,
    ),
    index("affiliate_commissions_affiliate_idx").on(
      table.affiliateId,
      table.status,
    ),
  ],
);

export const affiliatePayouts = pgTable(
  "affiliate_payouts",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    affiliateId: uuid("affiliate_id")
      .notNull()
      .references(() => affiliates.id, { onDelete: "cascade" }),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    amountCents: integer("amount_cents").notNull(),
    status: payoutStatus("status").notNull().default("PENDENTE"),
    pixEndToEndId: text("pix_end_to_end_id"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("affiliate_payouts_period_key").on(
      table.affiliateId,
      table.periodStart,
    ),
  ],
);

export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    code: text("code").notNull(),
    discountType: discountType("discount_type").notNull().default("PERCENT"),
    // PERCENT: basis points (1000 = 10%). AMOUNT: centavos.
    discountValue: integer("discount_value").notNull(),
    durationMonths: integer("duration_months"),
    maxRedemptions: integer("max_redemptions"),
    redemptions: integer("redemptions").notNull().default(0),
    affiliateId: uuid("affiliate_id").references(() => affiliates.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (table) => [uniqueIndex("coupons_code_key").on(table.code)],
);

export const couponRedemptions = pgTable(
  "coupon_redemptions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    couponId: uuid("coupon_id")
      .notNull()
      .references(() => coupons.id, { onDelete: "cascade" }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id, {
      onDelete: "set null",
    }),
    appliedAt: timestamp("applied_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("coupon_redemptions_unique_key").on(table.couponId, table.storeId),
  ],
);

export const storesRelations = relations(stores, ({ many }) => ({
  users: many(users),
  categories: many(categories),
  products: many(products),
  sales: many(sales),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  store: one(stores, { fields: [users.storeId], references: [stores.id] }),
  authTokens: many(authTokens),
}));

export const authTokensRelations = relations(authTokens, ({ one }) => ({
  user: one(users, { fields: [authTokens.userId], references: [users.id] }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  store: one(stores, { fields: [categories.storeId], references: [stores.id] }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  store: one(stores, { fields: [products.storeId], references: [stores.id] }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  images: many(productImages),
  movements: many(stockMovements),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, { fields: [saleItems.saleId], references: [sales.id] }),
  product: one(products, {
    fields: [saleItems.productId],
    references: [products.id],
  }),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  store: one(stores, { fields: [sales.storeId], references: [stores.id] }),
  customer: one(customers, {
    fields: [sales.customerId],
    references: [customers.id],
  }),
  seller: one(users, { fields: [sales.sellerId], references: [users.id] }),
  items: many(saleItems),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  store: one(stores, { fields: [subscriptions.storeId], references: [stores.id] }),
  invoices: many(invoices),
  events: many(subscriptionEvents),
}));

export const subscriptionEventsRelations = relations(
  subscriptionEvents,
  ({ one }) => ({
    subscription: one(subscriptions, {
      fields: [subscriptionEvents.subscriptionId],
      references: [subscriptions.id],
    }),
  }),
);

export const invoicesRelations = relations(invoices, ({ one }) => ({
  subscription: one(subscriptions, {
    fields: [invoices.subscriptionId],
    references: [subscriptions.id],
  }),
  store: one(stores, { fields: [invoices.storeId], references: [stores.id] }),
}));

export const affiliatesRelations = relations(affiliates, ({ many }) => ({
  referrals: many(affiliateReferrals),
  commissions: many(affiliateCommissions),
  payouts: many(affiliatePayouts),
}));

export const affiliateCommissionsRelations = relations(
  affiliateCommissions,
  ({ one }) => ({
    affiliate: one(affiliates, {
      fields: [affiliateCommissions.affiliateId],
      references: [affiliates.id],
    }),
    store: one(stores, {
      fields: [affiliateCommissions.storeId],
      references: [stores.id],
    }),
  }),
);

export type Store = typeof stores.$inferSelect;
export type User = typeof users.$inferSelect;
export type AuthToken = typeof authTokens.$inferSelect;
export type AuthTokenType = (typeof authTokenType.enumValues)[number];
export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductImage = typeof productImages.$inferSelect;
export type StockMovement = typeof stockMovements.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type CashSession = typeof cashSessions.$inferSelect;
export type CashMovement = typeof cashMovements.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type SaleItem = typeof saleItems.$inferSelect;
export type FinancialEntry = typeof financialEntries.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type SubscriptionEvent = typeof subscriptionEvents.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type PaymentEvent = typeof paymentEvents.$inferSelect;
export type Affiliate = typeof affiliates.$inferSelect;
export type AffiliateReferral = typeof affiliateReferrals.$inferSelect;
export type AffiliateCommission = typeof affiliateCommissions.$inferSelect;
export type AffiliatePayout = typeof affiliatePayouts.$inferSelect;
export type Coupon = typeof coupons.$inferSelect;
export type UserRole = (typeof userRole.enumValues)[number];
export type PaymentMethod = (typeof paymentMethod.enumValues)[number];
export type MovementType = (typeof movementType.enumValues)[number];
export type FinancialKind = (typeof financialKind.enumValues)[number];
export type FinancialStatus = (typeof financialStatus.enumValues)[number];
export type SubscriptionStatus = (typeof subscriptionStatus.enumValues)[number];
export type BillingInterval = (typeof billingInterval.enumValues)[number];
export type BillingMode = (typeof billingMode.enumValues)[number];
export type GrantType = (typeof grantType.enumValues)[number];
export type BillingProviderName = (typeof billingProviderName.enumValues)[number];
export type InvoiceStatus = (typeof invoiceStatus.enumValues)[number];
