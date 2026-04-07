CREATE TABLE IF NOT EXISTS "station_fuel_prices" (
  "id" serial PRIMARY KEY NOT NULL,
  "station_id" integer NOT NULL REFERENCES "stations"("id"),
  "fuel_grade" varchar(30) NOT NULL,
  "price_cents" integer NOT NULL,
  "source" varchar(30) NOT NULL DEFAULT 'manual',
  "recorded_at" timestamp NOT NULL DEFAULT now(),
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "station_fuel_prices_station_id_idx"
  ON "station_fuel_prices" ("station_id");
