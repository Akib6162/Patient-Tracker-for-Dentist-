ALTER TABLE "billing" ALTER COLUMN "payment_status" SET DEFAULT 'processing';
--> statement-breakpoint
ALTER TABLE "billing" DROP CONSTRAINT IF EXISTS "payment_status_check";
--> statement-breakpoint
ALTER TABLE "billing" ADD CONSTRAINT "payment_status_check" CHECK ("payment_status" IN ('clear', 'due', 'processing'));