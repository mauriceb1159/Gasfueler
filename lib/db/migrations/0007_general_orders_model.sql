CREATE TABLE IF NOT EXISTS "orders" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "station_id" integer,
  "order_type" varchar(30) NOT NULL DEFAULT 'fuel_service',
  "status" varchar(30) NOT NULL DEFAULT 'draft',
  "fuel_subtotal" integer NOT NULL DEFAULT 0,
  "store_subtotal" integer NOT NULL DEFAULT 0,
  "service_fee" integer NOT NULL DEFAULT 0,
  "tax_total" integer NOT NULL DEFAULT 0,
  "total_amount" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "order_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "order_id" integer NOT NULL,
  "item_type" varchar(30) NOT NULL,
  "store_item_id" integer,
  "station_store_item_id" integer,
  "item_name" varchar(120) NOT NULL,
  "quantity" integer NOT NULL DEFAULT 1,
  "unit_price" integer NOT NULL DEFAULT 0,
  "subtotal_price" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "order_items" ADD CONSTRAINT "order_items_store_item_id_store_items_id_fk" FOREIGN KEY ("store_item_id") REFERENCES "public"."store_items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "order_items" ADD CONSTRAINT "order_items_station_store_item_id_station_store_items_id_fk" FOREIGN KEY ("station_store_item_id") REFERENCES "public"."station_store_items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "fuel_requests"
ADD COLUMN IF NOT EXISTS "order_id" integer;

DO $$ BEGIN
 ALTER TABLE "fuel_requests" ADD CONSTRAINT "fuel_requests_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

INSERT INTO "orders" (
  "user_id",
  "station_id",
  "order_type",
  "status",
  "fuel_subtotal",
  "store_subtotal",
  "service_fee",
  "tax_total",
  "total_amount",
  "created_at",
  "updated_at"
)
SELECT
  fr."user_id",
  fr."station_id",
  CASE
    WHEN COALESCE(fr."addon_total", 0) > 0 THEN 'mixed'
    ELSE 'fuel_service'
  END,
  fr."status",
  COALESCE(fr."fuel_estimate", 0),
  COALESCE(fr."addon_total", 0),
  COALESCE(fr."service_fee", 0),
  0,
  COALESCE(fr."total_estimate", 0),
  fr."created_at",
  fr."updated_at"
FROM "fuel_requests" fr
WHERE fr."order_id" IS NULL;

UPDATE "fuel_requests" fr
SET "order_id" = o."id"
FROM "orders" o
WHERE fr."order_id" IS NULL
  AND o."user_id" = fr."user_id"
  AND (
    (o."station_id" IS NULL AND fr."station_id" IS NULL)
    OR o."station_id" = fr."station_id"
  )
  AND o."created_at" = fr."created_at";

INSERT INTO "order_items" (
  "order_id",
  "item_type",
  "store_item_id",
  "item_name",
  "quantity",
  "unit_price",
  "subtotal_price",
  "created_at",
  "updated_at"
)
SELECT
  fr."order_id",
  COALESCE(fri."item_type", 'store_item'),
  fri."store_item_id",
  fri."item_name",
  fri."quantity",
  fri."unit_price",
  COALESCE(fri."subtotal_price", fri."unit_price" * fri."quantity"),
  fr."created_at",
  fr."updated_at"
FROM "fuel_request_items" fri
JOIN "fuel_requests" fr ON fr."id" = fri."fuel_request_id"
WHERE fr."order_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "order_items" oi
    WHERE oi."order_id" = fr."order_id"
      AND oi."item_name" = fri."item_name"
      AND oi."quantity" = fri."quantity"
      AND oi."unit_price" = fri."unit_price"
  );

CREATE INDEX IF NOT EXISTS "orders_user_id_idx"
  ON "orders" ("user_id");

CREATE INDEX IF NOT EXISTS "orders_station_id_idx"
  ON "orders" ("station_id");

CREATE INDEX IF NOT EXISTS "order_items_order_id_idx"
  ON "order_items" ("order_id");

CREATE INDEX IF NOT EXISTS "fuel_requests_order_id_idx"
  ON "fuel_requests" ("order_id");
