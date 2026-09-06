ALTER TABLE "fuel_requests"
ADD COLUMN IF NOT EXISTS "tire_front_left_photo_url" text,
ADD COLUMN IF NOT EXISTS "tire_front_right_photo_url" text,
ADD COLUMN IF NOT EXISTS "tire_rear_left_photo_url" text,
ADD COLUMN IF NOT EXISTS "tire_rear_right_photo_url" text;
