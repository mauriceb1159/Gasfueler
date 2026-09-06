INSERT INTO "station_fuel_prices" (
  "station_id",
  "fuel_grade",
  "price_cents",
  "source",
  "recorded_at"
)
SELECT
  s."id",
  'diesel',
  559,
  'manual',
  NOW()
FROM "stations" s
WHERE NOT EXISTS (
  SELECT 1
  FROM "station_fuel_prices" sfp
  WHERE sfp."station_id" = s."id"
    AND sfp."fuel_grade" = 'diesel'
);
