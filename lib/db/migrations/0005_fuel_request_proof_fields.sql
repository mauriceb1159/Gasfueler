ALTER TABLE "fuel_requests"
ADD COLUMN IF NOT EXISTS "actual_gallons" integer,
ADD COLUMN IF NOT EXISTS "actual_price_per_gallon" integer,
ADD COLUMN IF NOT EXISTS "actual_fuel_total" integer,
ADD COLUMN IF NOT EXISTS "pump_photo_url" text,
ADD COLUMN IF NOT EXISTS "gas_cap_photo_url" text,
ADD COLUMN IF NOT EXISTS "completed_at" timestamp;
