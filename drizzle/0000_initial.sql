CREATE TYPE "public"."cash_movement_type" AS ENUM('ENTRADA', 'SAIDA', 'SANGRIA', 'SUPRIMENTO');--> statement-breakpoint
CREATE TYPE "public"."cash_session_status" AS ENUM('ABERTO', 'FECHADO');--> statement-breakpoint
CREATE TYPE "public"."financial_kind" AS ENUM('RECEBER', 'PAGAR');--> statement-breakpoint
CREATE TYPE "public"."financial_status" AS ENUM('PENDENTE', 'PAGO', 'CANCELADO');--> statement-breakpoint
CREATE TYPE "public"."movement_type" AS ENUM('ENTRADA', 'SAIDA', 'AJUSTE');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('DINHEIRO', 'PIX', 'DEBITO', 'CREDITO', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."sale_status" AS ENUM('ABERTA', 'PAGA', 'CANCELADA');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('OWNER', 'GERENTE', 'VENDEDOR', 'CLIENTE');--> statement-breakpoint
CREATE TABLE "cash_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"cash_session_id" uuid NOT NULL,
	"type" "cash_movement_type" NOT NULL,
	"amount_cents" integer NOT NULL,
	"description" text,
	"sale_id" uuid,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"opened_by_id" uuid,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"opening_amount_cents" integer DEFAULT 0 NOT NULL,
	"closed_by_id" uuid,
	"closed_at" timestamp with time zone,
	"closing_amount_cents" integer,
	"status" "cash_session_status" DEFAULT 'ABERTO' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"kind" text DEFAULT 'TIPO' NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"document" text,
	"address" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"kind" "financial_kind" NOT NULL,
	"status" "financial_status" DEFAULT 'PENDENTE' NOT NULL,
	"description" text NOT NULL,
	"category" text,
	"amount_cents" integer NOT NULL,
	"due_date" date NOT NULL,
	"paid_at" timestamp with time zone,
	"payment_method" "payment_method",
	"sale_id" uuid,
	"customer_id" uuid,
	"created_by_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"url" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"category_id" uuid,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"barcode" text,
	"unit" text DEFAULT 'UN' NOT NULL,
	"price_cents" integer DEFAULT 0 NOT NULL,
	"cost_cents" integer DEFAULT 0 NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"min_quantity" integer DEFAULT 0 NOT NULL,
	"location" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_id" uuid NOT NULL,
	"product_id" uuid,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"unit_cost_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"customer_id" uuid,
	"seller_id" uuid,
	"cash_session_id" uuid,
	"status" "sale_status" DEFAULT 'ABERTA' NOT NULL,
	"subtotal_cents" integer DEFAULT 0 NOT NULL,
	"discount_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer DEFAULT 0 NOT NULL,
	"payment_method" "payment_method",
	"notes" text,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seq" bigserial NOT NULL,
	"store_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"type" "movement_type" NOT NULL,
	"quantity" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"unit_cost_cents" integer,
	"reason" text,
	"reference" text,
	"sale_id" uuid,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"legal_name" text,
	"document" text,
	"email" text,
	"phone" text,
	"whatsapp" text,
	"address" text,
	"logo_url" text,
	"hero_title" text,
	"hero_subtitle" text,
	"hero_image_url" text,
	"about_text" text,
	"primary_color" text DEFAULT '#4f46e5' NOT NULL,
	"secondary_color" text DEFAULT '#0f172a' NOT NULL,
	"accent_color" text DEFAULT '#f59e0b' NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"show_out_of_stock" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'VENDEDOR' NOT NULL,
	"phone" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_cash_session_id_cash_sessions_id_fk" FOREIGN KEY ("cash_session_id") REFERENCES "public"."cash_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_opened_by_id_users_id_fk" FOREIGN KEY ("opened_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_closed_by_id_users_id_fk" FOREIGN KEY ("closed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_cash_session_id_cash_sessions_id_fk" FOREIGN KEY ("cash_session_id") REFERENCES "public"."cash_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cash_movements_session_idx" ON "cash_movements" USING btree ("cash_session_id","created_at");--> statement-breakpoint
CREATE INDEX "cash_sessions_store_idx" ON "cash_sessions" USING btree ("store_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_store_slug_key" ON "categories" USING btree ("store_id","slug");--> statement-breakpoint
CREATE INDEX "categories_store_idx" ON "categories" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "customers_store_idx" ON "customers" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "financial_entries_store_due_idx" ON "financial_entries" USING btree ("store_id","due_date");--> statement-breakpoint
CREATE INDEX "financial_entries_store_status_idx" ON "financial_entries" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "product_images_product_idx" ON "product_images" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_store_code_key" ON "products" USING btree ("store_id","code");--> statement-breakpoint
CREATE INDEX "products_store_idx" ON "products" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "sale_items_sale_idx" ON "sale_items" USING btree ("sale_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_store_number_key" ON "sales" USING btree ("store_id","number");--> statement-breakpoint
CREATE INDEX "sales_store_created_idx" ON "sales" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE INDEX "stock_movements_store_idx" ON "stock_movements" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE INDEX "stock_movements_product_idx" ON "stock_movements" USING btree ("product_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_movements_seq_key" ON "stock_movements" USING btree ("seq");--> statement-breakpoint
CREATE UNIQUE INDEX "stores_slug_key" ON "stores" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "users_store_idx" ON "users" USING btree ("store_id");