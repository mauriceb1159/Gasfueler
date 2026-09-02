ALTER TABLE "fuel_requests"
ADD COLUMN IF NOT EXISTS "gas_cap_before_photo_url" text,
ADD COLUMN IF NOT EXISTS "gas_cap_after_photo_url" text,
ADD COLUMN IF NOT EXISTS "receipt_photo_url" text;
