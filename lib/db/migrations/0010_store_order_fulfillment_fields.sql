ALTER TABLE "orders"
ADD COLUMN "pickup_mode" varchar(30),
ADD COLUMN "pickup_window_start" timestamp,
ADD COLUMN "pickup_window_end" timestamp,
ADD COLUMN "customer_notes" text,
ADD COLUMN "fulfillment_status" varchar(30) NOT NULL DEFAULT 'draft',
ADD COLUMN "ready_at" timestamp,
ADD COLUMN "fulfilled_at" timestamp,
ADD COLUMN "cancel_reason" text;
