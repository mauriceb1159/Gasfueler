CREATE TABLE IF NOT EXISTS "store_categories" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(100) NOT NULL,
  "slug" varchar(100) NOT NULL,
  "active" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "store_categories_slug_unique" UNIQUE("slug")
);

CREATE TABLE IF NOT EXISTS "store_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "category_id" integer NOT NULL,
  "name" varchar(120) NOT NULL,
  "slug" varchar(120) NOT NULL,
  "description" text,
  "image_url" text,
  "base_price_cents" integer NOT NULL DEFAULT 0,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "store_items_slug_unique" UNIQUE("slug")
);

CREATE TABLE IF NOT EXISTS "station_store_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "station_id" integer NOT NULL,
  "store_item_id" integer NOT NULL,
  "price_cents" integer NOT NULL DEFAULT 0,
  "active" boolean NOT NULL DEFAULT true,
  "inventory_count" integer,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

DO $$ BEGIN
 ALTER TABLE "store_items" ADD CONSTRAINT "store_items_category_id_store_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."store_categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "station_store_items" ADD CONSTRAINT "station_store_items_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "station_store_items" ADD CONSTRAINT "station_store_items_store_item_id_store_items_id_fk" FOREIGN KEY ("store_item_id") REFERENCES "public"."store_items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "fuel_request_items"
ADD COLUMN IF NOT EXISTS "item_type" varchar(30) NOT NULL DEFAULT 'store_item';

ALTER TABLE "fuel_request_items"
ADD COLUMN IF NOT EXISTS "store_item_id" integer;

ALTER TABLE "fuel_request_items"
ADD COLUMN IF NOT EXISTS "subtotal_price" integer NOT NULL DEFAULT 0;

DO $$ BEGIN
 ALTER TABLE "fuel_request_items" ADD CONSTRAINT "fuel_request_items_store_item_id_store_items_id_fk" FOREIGN KEY ("store_item_id") REFERENCES "public"."store_items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

UPDATE "fuel_request_items"
SET "subtotal_price" = COALESCE("unit_price", 0) * COALESCE("quantity", 0)
WHERE "subtotal_price" = 0;

CREATE INDEX IF NOT EXISTS "store_items_category_id_idx"
  ON "store_items" ("category_id");

CREATE INDEX IF NOT EXISTS "station_store_items_station_id_idx"
  ON "station_store_items" ("station_id");

CREATE INDEX IF NOT EXISTS "station_store_items_store_item_id_idx"
  ON "station_store_items" ("store_item_id");

CREATE INDEX IF NOT EXISTS "fuel_request_items_store_item_id_idx"
  ON "fuel_request_items" ("store_item_id");
