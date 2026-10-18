ALTER TABLE "affiliates" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "affiliates" ADD COLUMN "terms_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "affiliates" ADD COLUMN "last_login_at" timestamp with time zone;