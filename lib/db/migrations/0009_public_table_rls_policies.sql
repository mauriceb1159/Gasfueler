DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'DROP POLICY IF EXISTS "stations_public_read" ON "stations"';
    EXECUTE 'CREATE POLICY "stations_public_read" ON "stations" FOR SELECT TO anon, authenticated USING ("active" = true)';

    EXECUTE 'DROP POLICY IF EXISTS "station_hours_public_read" ON "station_hours"';
    EXECUTE 'CREATE POLICY "station_hours_public_read" ON "station_hours" FOR SELECT TO anon, authenticated USING (
      EXISTS (
        SELECT 1
        FROM "stations" s
        WHERE s."id" = "station_hours"."station_id"
          AND s."active" = true
      )
    )';

    EXECUTE 'DROP POLICY IF EXISTS "service_slots_public_read" ON "service_slots"';
    EXECUTE 'CREATE POLICY "service_slots_public_read" ON "service_slots" FOR SELECT TO anon, authenticated USING (
      "status" = ''open''
      AND "start_at" >= now()
      AND EXISTS (
        SELECT 1
        FROM "stations" s
        WHERE s."id" = "service_slots"."station_id"
          AND s."active" = true
      )
    )';

    EXECUTE 'DROP POLICY IF EXISTS "station_fuel_prices_public_read" ON "station_fuel_prices"';
    EXECUTE 'CREATE POLICY "station_fuel_prices_public_read" ON "station_fuel_prices" FOR SELECT TO anon, authenticated USING (
      EXISTS (
        SELECT 1
        FROM "stations" s
        WHERE s."id" = "station_fuel_prices"."station_id"
          AND s."active" = true
      )
    )';

    EXECUTE 'DROP POLICY IF EXISTS "store_categories_public_read" ON "store_categories"';
    EXECUTE 'CREATE POLICY "store_categories_public_read" ON "store_categories" FOR SELECT TO anon, authenticated USING ("active" = true)';

    EXECUTE 'DROP POLICY IF EXISTS "store_items_public_read" ON "store_items"';
    EXECUTE 'CREATE POLICY "store_items_public_read" ON "store_items" FOR SELECT TO anon, authenticated USING (
      "active" = true
      AND EXISTS (
        SELECT 1
        FROM "store_categories" sc
        WHERE sc."id" = "store_items"."category_id"
          AND sc."active" = true
      )
    )';

    EXECUTE 'DROP POLICY IF EXISTS "station_store_items_public_read" ON "station_store_items"';
    EXECUTE 'CREATE POLICY "station_store_items_public_read" ON "station_store_items" FOR SELECT TO anon, authenticated USING (
      "active" = true
      AND EXISTS (
        SELECT 1
        FROM "stations" s
        WHERE s."id" = "station_store_items"."station_id"
          AND s."active" = true
      )
      AND EXISTS (
        SELECT 1
        FROM "store_items" si
        JOIN "store_categories" sc ON sc."id" = si."category_id"
        WHERE si."id" = "station_store_items"."store_item_id"
          AND si."active" = true
          AND sc."active" = true
      )
    )';
  END IF;
END $$;
