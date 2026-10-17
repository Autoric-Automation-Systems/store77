import { relations, sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  date,
  index,
  integer,
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
export type UserRole = (typeof userRole.enumValues)[number];
export type PaymentMethod = (typeof paymentMethod.enumValues)[number];
export type MovementType = (typeof movementType.enumValues)[number];
export type FinancialKind = (typeof financialKind.enumValues)[number];
export type FinancialStatus = (typeof financialStatus.enumValues)[number];
