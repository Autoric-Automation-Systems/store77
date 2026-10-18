ALTER TABLE "affiliate_commissions" ADD COLUMN "payout_id" uuid;--> statement-breakpoint
ALTER TABLE "affiliate_payouts" ADD COLUMN "provider_transfer_id" text;--> statement-breakpoint
ALTER TABLE "affiliate_payouts" ADD COLUMN "failure_reason" text;--> statement-breakpoint
ALTER TABLE "affiliates" ADD COLUMN "pix_key_type" text;--> statement-breakpoint
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_payout_id_affiliate_payouts_id_fk" FOREIGN KEY ("payout_id") REFERENCES "public"."affiliate_payouts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "affiliate_payouts_status_idx" ON "affiliate_payouts" USING btree ("status");