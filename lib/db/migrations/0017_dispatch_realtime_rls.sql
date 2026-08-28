ALTER TABLE "drivers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dispatch_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dispatch_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "driver_locations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dispatch_events" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  realtime_table_name text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH realtime_table_name IN ARRAY ARRAY[
      'drivers',
      'dispatch_jobs',
      'dispatch_assignments',
      'driver_locations',
      'dispatch_events'
    ]
    LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = realtime_table_name
      ) THEN
        EXECUTE format(
          'ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',
          realtime_table_name
        );
      END IF;
    END LOOP;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
     AND to_regprocedure('auth.uid()') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "drivers_dispatch_read" ON "drivers"';
    EXECUTE 'CREATE POLICY "drivers_dispatch_read" ON "drivers" FOR SELECT TO authenticated USING (
      EXISTS (
        SELECT 1 FROM "users" current_user_record
        WHERE current_user_record."supabase_auth_user_id" = auth.uid()::text
          AND current_user_record."role" IN (''dispatcher'', ''admin'', ''main_admin'')
      )
      OR EXISTS (
        SELECT 1 FROM "users" driver_user
        WHERE driver_user."id" = "drivers"."user_id"
          AND driver_user."supabase_auth_user_id" = auth.uid()::text
      )
    )';

    EXECUTE 'DROP POLICY IF EXISTS "dispatch_jobs_dispatch_read" ON "dispatch_jobs"';
    EXECUTE 'CREATE POLICY "dispatch_jobs_dispatch_read" ON "dispatch_jobs" FOR SELECT TO authenticated USING (
      EXISTS (
        SELECT 1 FROM "users" current_user_record
        WHERE current_user_record."supabase_auth_user_id" = auth.uid()::text
          AND current_user_record."role" IN (''dispatcher'', ''admin'', ''main_admin'')
      )
      OR EXISTS (
        SELECT 1 FROM "users" customer_user
        WHERE customer_user."id" = "dispatch_jobs"."customer_user_id"
          AND customer_user."supabase_auth_user_id" = auth.uid()::text
      )
      OR EXISTS (
        SELECT 1
        FROM "dispatch_assignments" da
        JOIN "drivers" d ON d."id" = da."driver_id"
        JOIN "users" driver_user ON driver_user."id" = d."user_id"
        WHERE da."dispatch_job_id" = "dispatch_jobs"."id"
          AND da."assignment_status" IN (''assigned'', ''accepted'')
          AND driver_user."supabase_auth_user_id" = auth.uid()::text
      )
    )';

    EXECUTE 'DROP POLICY IF EXISTS "dispatch_assignments_dispatch_read" ON "dispatch_assignments"';
    EXECUTE 'CREATE POLICY "dispatch_assignments_dispatch_read" ON "dispatch_assignments" FOR SELECT TO authenticated USING (
      EXISTS (
        SELECT 1 FROM "users" current_user_record
        WHERE current_user_record."supabase_auth_user_id" = auth.uid()::text
          AND current_user_record."role" IN (''dispatcher'', ''admin'', ''main_admin'')
      )
      OR EXISTS (
        SELECT 1
        FROM "drivers" d
        JOIN "users" driver_user ON driver_user."id" = d."user_id"
        WHERE d."id" = "dispatch_assignments"."driver_id"
          AND driver_user."supabase_auth_user_id" = auth.uid()::text
      )
      OR EXISTS (
        SELECT 1
        FROM "dispatch_jobs" dj
        JOIN "users" customer_user ON customer_user."id" = dj."customer_user_id"
        WHERE dj."id" = "dispatch_assignments"."dispatch_job_id"
          AND customer_user."supabase_auth_user_id" = auth.uid()::text
      )
    )';

    EXECUTE 'DROP POLICY IF EXISTS "driver_locations_dispatch_read" ON "driver_locations"';
    EXECUTE 'CREATE POLICY "driver_locations_dispatch_read" ON "driver_locations" FOR SELECT TO authenticated USING (
      EXISTS (
        SELECT 1 FROM "users" current_user_record
        WHERE current_user_record."supabase_auth_user_id" = auth.uid()::text
          AND current_user_record."role" IN (''dispatcher'', ''admin'', ''main_admin'')
      )
      OR EXISTS (
        SELECT 1
        FROM "drivers" d
        JOIN "users" driver_user ON driver_user."id" = d."user_id"
        WHERE d."id" = "driver_locations"."driver_id"
          AND driver_user."supabase_auth_user_id" = auth.uid()::text
      )
      OR EXISTS (
        SELECT 1
        FROM "dispatch_assignments" da
        JOIN "dispatch_jobs" dj ON dj."id" = da."dispatch_job_id"
        JOIN "users" customer_user ON customer_user."id" = dj."customer_user_id"
        WHERE da."driver_id" = "driver_locations"."driver_id"
          AND da."assignment_status" IN (''assigned'', ''accepted'')
          AND dj."status" NOT IN (''completed'', ''canceled'')
          AND customer_user."supabase_auth_user_id" = auth.uid()::text
      )
    )';

    EXECUTE 'DROP POLICY IF EXISTS "driver_locations_self_insert" ON "driver_locations"';
    EXECUTE 'CREATE POLICY "driver_locations_self_insert" ON "driver_locations" FOR INSERT TO authenticated WITH CHECK (
      EXISTS (
        SELECT 1
        FROM "drivers" d
        JOIN "users" driver_user ON driver_user."id" = d."user_id"
        WHERE d."id" = "driver_locations"."driver_id"
          AND driver_user."supabase_auth_user_id" = auth.uid()::text
      )
    )';

    EXECUTE 'DROP POLICY IF EXISTS "dispatch_events_dispatch_read" ON "dispatch_events"';
    EXECUTE 'CREATE POLICY "dispatch_events_dispatch_read" ON "dispatch_events" FOR SELECT TO authenticated USING (
      EXISTS (
        SELECT 1 FROM "users" current_user_record
        WHERE current_user_record."supabase_auth_user_id" = auth.uid()::text
          AND current_user_record."role" IN (''dispatcher'', ''admin'', ''main_admin'')
      )
      OR EXISTS (
        SELECT 1
        FROM "dispatch_jobs" dj
        JOIN "users" customer_user ON customer_user."id" = dj."customer_user_id"
        WHERE dj."id" = "dispatch_events"."dispatch_job_id"
          AND customer_user."supabase_auth_user_id" = auth.uid()::text
      )
      OR EXISTS (
        SELECT 1
        FROM "dispatch_jobs" dj
        JOIN "dispatch_assignments" da ON da."dispatch_job_id" = dj."id"
        JOIN "drivers" d ON d."id" = da."driver_id"
        JOIN "users" driver_user ON driver_user."id" = d."user_id"
        WHERE dj."id" = "dispatch_events"."dispatch_job_id"
          AND da."assignment_status" IN (''assigned'', ''accepted'')
          AND driver_user."supabase_auth_user_id" = auth.uid()::text
      )
    )';
  END IF;
END $$;
