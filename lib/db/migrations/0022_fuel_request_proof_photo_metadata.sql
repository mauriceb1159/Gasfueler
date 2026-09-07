ALTER TABLE "fuel_requests"
ADD COLUMN IF NOT EXISTS "proof_photo_metadata" jsonb;
