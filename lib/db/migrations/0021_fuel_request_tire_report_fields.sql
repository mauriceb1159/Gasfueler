ALTER TABLE "fuel_requests"
ADD COLUMN IF NOT EXISTS "tire_report_url" text,
ADD COLUMN IF NOT EXISTS "tire_report_generated_at" timestamp,
ADD COLUMN IF NOT EXISTS "tire_report_emailed_at" timestamp;
