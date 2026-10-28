ALTER TABLE "products" ADD COLUMN "credit_price_cents" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "installments" integer DEFAULT 1 NOT NULL;