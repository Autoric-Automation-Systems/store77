CREATE TYPE "public"."affiliate_status" AS ENUM('PENDENTE', 'ATIVO', 'SUSPENSO', 'RECUSADO');--> statement-breakpoint
CREATE TYPE "public"."billing_interval" AS ENUM('MONTHLY', 'YEARLY');--> statement-breakpoint
CREATE TYPE "public"."billing_mode" AS ENUM('PROVIDER', 'COMPLIMENTARY');--> statement-breakpoint
CREATE TYPE "public"."billing_provider_name" AS ENUM('ASAAS', 'STRIPE', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."commission_status" AS ENUM('PENDENTE', 'DISPONIVEL', 'PAGO', 'ESTORNADO');--> statement-breakpoint
CREATE TYPE "public"."discount_type" AS ENUM('PERCENT', 'AMOUNT');--> statement-breakpoint
CREATE TYPE "public"."grant_type" AS ENUM('PAID', 'TRIAL', 'GIFT', 'INTERNAL', 'LEGACY', 'PROMO');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('PENDENTE', 'PAGA', 'VENCIDA', 'CANCELADA', 'ESTORNADA');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('PENDENTE', 'PAGO', 'CANCELADO');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('TRIALING', 'ACTIVE', 'PAST_DUE', 'RESTRICTED', 'SUSPENDED', 'CANCELED');--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'CAIXA' BEFORE 'CLIENTE';--> statement-breakpoint
CREATE TABLE "affiliate_commissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"affiliate_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"invoice_id" uuid,
	"base_amount_cents" integer NOT NULL,
	"rate_bp" integer NOT NULL,
	"amount_cents" integer NOT NULL,
	"status" "commission_status" DEFAULT 'PENDENTE' NOT NULL,
	"available_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "affiliate_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"affiliate_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"amount_cents" integer NOT NULL,
	"status" "payout_status" DEFAULT 'PENDENTE' NOT NULL,
	"pix_end_to_end_id" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "affiliate_referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"affiliate_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"code" text NOT NULL,
	"attributed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"converted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "affiliates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"document" text,
	"pix_key" text,
	"code" text NOT NULL,
	"status" "affiliate_status" DEFAULT 'PENDENTE' NOT NULL,
	"commission_rate_bp" integer DEFAULT 2500 NOT NULL,
	"commission_months" integer DEFAULT 12 NOT NULL,
	"tier" text DEFAULT 'AFILIADO' NOT NULL,
	"approved_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupon_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coupon_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"subscription_id" uuid,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"discount_type" "discount_type" DEFAULT 'PERCENT' NOT NULL,
	"discount_value" integer NOT NULL,
	"duration_months" integer,
	"max_redemptions" integer,
	"redemptions" integer DEFAULT 0 NOT NULL,
	"affiliate_id" uuid,
	"expires_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"provider" "billing_provider_name" DEFAULT 'MANUAL' NOT NULL,
	"provider_invoice_id" text,
	"status" "invoice_status" DEFAULT 'PENDENTE' NOT NULL,
	"description" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"billing_type" text,
	"due_date" date NOT NULL,
	"paid_at" timestamp with time zone,
	"period_start" timestamp with time zone,
	"period_end" timestamp with time zone,
	"invoice_url" text,
	"bank_slip_url" text,
	"pix_payload" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "billing_provider_name" NOT NULL,
	"external_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "platform_admins" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"subscription_id" uuid NOT NULL,
	"type" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"actor_user_id" uuid,
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"plan_code" text NOT NULL,
	"price_version" text NOT NULL,
	"status" "subscription_status" DEFAULT 'TRIALING' NOT NULL,
	"billing_mode" "billing_mode" DEFAULT 'PROVIDER' NOT NULL,
	"interval" "billing_interval" DEFAULT 'MONTHLY' NOT NULL,
	"provider" "billing_provider_name" DEFAULT 'MANUAL' NOT NULL,
	"provider_customer_id" text,
	"provider_subscription_id" text,
	"extra_seats" integer DEFAULT 0 NOT NULL,
	"extra_stores" integer DEFAULT 0 NOT NULL,
	"extra_sales_packs" integer DEFAULT 0 NOT NULL,
	"trial_ends_at" timestamp with time zone,
	"current_period_start" timestamp with time zone DEFAULT now() NOT NULL,
	"current_period_end" timestamp with time zone,
	"grant_type" "grant_type" DEFAULT 'TRIAL' NOT NULL,
	"grant_expires_at" timestamp with time zone,
	"granted_by_user_id" uuid,
	"grant_reason" text,
	"exclude_from_metrics" boolean DEFAULT false NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoke_reason" text,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_affiliate_id_affiliates_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_payouts" ADD CONSTRAINT "affiliate_payouts_affiliate_id_affiliates_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_referrals" ADD CONSTRAINT "affiliate_referrals_affiliate_id_affiliates_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_referrals" ADD CONSTRAINT "affiliate_referrals_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_affiliate_id_affiliates_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_admins" ADD CONSTRAINT "platform_admins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_granted_by_user_id_users_id_fk" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "affiliate_commissions_invoice_key" ON "affiliate_commissions" USING btree ("invoice_id","affiliate_id");--> statement-breakpoint
CREATE INDEX "affiliate_commissions_affiliate_idx" ON "affiliate_commissions" USING btree ("affiliate_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "affiliate_payouts_period_key" ON "affiliate_payouts" USING btree ("affiliate_id","period_start");--> statement-breakpoint
CREATE UNIQUE INDEX "affiliate_referrals_store_key" ON "affiliate_referrals" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "affiliate_referrals_affiliate_idx" ON "affiliate_referrals" USING btree ("affiliate_id");--> statement-breakpoint
CREATE UNIQUE INDEX "affiliates_code_key" ON "affiliates" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "affiliates_email_key" ON "affiliates" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "coupon_redemptions_unique_key" ON "coupon_redemptions" USING btree ("coupon_id","store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_provider_id_key" ON "invoices" USING btree ("provider","provider_invoice_id");--> statement-breakpoint
CREATE INDEX "invoices_store_due_idx" ON "invoices" USING btree ("store_id","due_date");--> statement-breakpoint
CREATE INDEX "invoices_sub_idx" ON "invoices" USING btree ("subscription_id","due_date");--> statement-breakpoint
CREATE INDEX "invoices_status_idx" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_events_external_key" ON "payment_events" USING btree ("provider","external_id");--> statement-breakpoint
CREATE INDEX "payment_events_received_idx" ON "payment_events" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "subscription_events_store_idx" ON "subscription_events" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE INDEX "subscription_events_sub_idx" ON "subscription_events" USING btree ("subscription_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_store_key" ON "subscriptions" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subscriptions_provider_sub_idx" ON "subscriptions" USING btree ("provider_subscription_id");--> statement-breakpoint
-- Lojas criadas antes da cobrança entram em cortesia de migração por 90 dias.
-- Depois disso, a tela de assinatura pede a contratação do plano.
INSERT INTO "subscriptions" (
        "store_id",
        "plan_code",
        "price_version",
        "status",
        "billing_mode",
        "interval",
        "provider",
        "current_period_start",
        "current_period_end",
        "grant_type",
        "grant_expires_at",
        "grant_reason"
)
SELECT
        s."id",
        'LEGACY',
        '2026-10',
        'ACTIVE',
        'COMPLIMENTARY',
        'MONTHLY',
        'MANUAL',
        now(),
        now() + interval '90 days',
        'LEGACY',
        now() + interval '90 days',
        'Cortesia de migração: loja criada antes da cobrança'
FROM "stores" s
WHERE NOT EXISTS (
        SELECT 1 FROM "subscriptions" sub WHERE sub."store_id" = s."id"
)
ON CONFLICT ("store_id") DO NOTHING;
