CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims jsonb;
  raw_value text;
BEGIN
  BEGIN
    claims := COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
  EXCEPTION
    WHEN OTHERS THEN
      claims := '{}'::jsonb;
  END;

  raw_value := COALESCE(claims ->> 'app_user_id', claims ->> 'user_id');

  IF raw_value IS NULL OR raw_value !~ '^\d+$' THEN
    RETURN NULL;
  END IF;

  RETURN raw_value::integer;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_request_email()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims jsonb;
BEGIN
  BEGIN
    claims := COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
  EXCEPTION
    WHEN OTHERS THEN
      claims := '{}'::jsonb;
  END;

  RETURN NULLIF(lower(claims ->> 'email'), '');
END;
$$;

CREATE OR REPLACE FUNCTION public.current_app_user_is_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = public.current_app_user_id()
      AND u.role = 'owner'
      AND u.deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.is_team_member(team_id integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    JOIN public.users u ON u.id = tm.user_id
    WHERE tm.team_id = is_team_member.team_id
      AND tm.user_id = public.current_app_user_id()
      AND u.deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.is_team_owner(team_id integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    JOIN public.users u ON u.id = tm.user_id
    WHERE tm.team_id = is_team_owner.team_id
      AND tm.user_id = public.current_app_user_id()
      AND tm.role = 'owner'
      AND u.deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.shares_team_with_user(target_user_id integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members mine
    JOIN public.team_members target
      ON target.team_id = mine.team_id
    JOIN public.users u ON u.id = target.user_id
    WHERE mine.user_id = public.current_app_user_id()
      AND target.user_id = shares_team_with_user.target_user_id
      AND u.deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_order(target_order_id integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = can_access_order.target_order_id
      AND (
        o.user_id = public.current_app_user_id()
        OR public.current_app_user_is_owner()
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_fuel_request(target_fuel_request_id integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.fuel_requests fr
    WHERE fr.id = can_access_fuel_request.target_fuel_request_id
      AND (
        fr.user_id = public.current_app_user_id()
        OR public.current_app_user_is_owner()
      )
  );
$$;

DROP POLICY IF EXISTS "users_select_self_or_owner" ON "users";
CREATE POLICY "users_select_self_or_owner"
  ON "users"
  FOR SELECT
  TO authenticated
  USING (
    "id" = public.current_app_user_id()
    OR public.current_app_user_is_owner()
    OR public.shares_team_with_user("id")
  );

DROP POLICY IF EXISTS "users_update_self_or_owner" ON "users";
CREATE POLICY "users_update_self_or_owner"
  ON "users"
  FOR UPDATE
  TO authenticated
  USING (
    "id" = public.current_app_user_id()
    OR public.current_app_user_is_owner()
  )
  WITH CHECK (
    "id" = public.current_app_user_id()
    OR public.current_app_user_is_owner()
  );

DROP POLICY IF EXISTS "teams_select_members" ON "teams";
CREATE POLICY "teams_select_members"
  ON "teams"
  FOR SELECT
  TO authenticated
  USING (public.is_team_member("id"));

DROP POLICY IF EXISTS "teams_update_owners" ON "teams";
CREATE POLICY "teams_update_owners"
  ON "teams"
  FOR UPDATE
  TO authenticated
  USING (public.is_team_owner("id"))
  WITH CHECK (public.is_team_owner("id"));

DROP POLICY IF EXISTS "team_members_select_members" ON "team_members";
CREATE POLICY "team_members_select_members"
  ON "team_members"
  FOR SELECT
  TO authenticated
  USING (public.is_team_member("team_id"));

DROP POLICY IF EXISTS "team_members_manage_owners" ON "team_members";
CREATE POLICY "team_members_manage_owners"
  ON "team_members"
  FOR ALL
  TO authenticated
  USING (public.is_team_owner("team_id"))
  WITH CHECK (public.is_team_owner("team_id"));

DROP POLICY IF EXISTS "activity_logs_select_members" ON "activity_logs";
CREATE POLICY "activity_logs_select_members"
  ON "activity_logs"
  FOR SELECT
  TO authenticated
  USING (public.is_team_member("team_id"));

DROP POLICY IF EXISTS "activity_logs_insert_members" ON "activity_logs";
CREATE POLICY "activity_logs_insert_members"
  ON "activity_logs"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_team_member("team_id")
    AND COALESCE("user_id", public.current_app_user_id()) = public.current_app_user_id()
  );

DROP POLICY IF EXISTS "invitations_select_members_or_invitee" ON "invitations";
CREATE POLICY "invitations_select_members_or_invitee"
  ON "invitations"
  FOR SELECT
  TO authenticated
  USING (
    public.is_team_member("team_id")
    OR lower("email") = public.current_request_email()
  );

DROP POLICY IF EXISTS "invitations_manage_team_owners" ON "invitations";
CREATE POLICY "invitations_manage_team_owners"
  ON "invitations"
  FOR ALL
  TO authenticated
  USING (public.is_team_owner("team_id"))
  WITH CHECK (public.is_team_owner("team_id"));

DROP POLICY IF EXISTS "vehicles_select_owner_or_admin" ON "vehicles";
CREATE POLICY "vehicles_select_owner_or_admin"
  ON "vehicles"
  FOR SELECT
  TO authenticated
  USING (
    "user_id" = public.current_app_user_id()
    OR public.current_app_user_is_owner()
  );

DROP POLICY IF EXISTS "vehicles_manage_owner_or_admin" ON "vehicles";
CREATE POLICY "vehicles_manage_owner_or_admin"
  ON "vehicles"
  FOR ALL
  TO authenticated
  USING (
    "user_id" = public.current_app_user_id()
    OR public.current_app_user_is_owner()
  )
  WITH CHECK (
    "user_id" = public.current_app_user_id()
    OR public.current_app_user_is_owner()
  );

DROP POLICY IF EXISTS "orders_select_owner_or_admin" ON "orders";
CREATE POLICY "orders_select_owner_or_admin"
  ON "orders"
  FOR SELECT
  TO authenticated
  USING (
    "user_id" = public.current_app_user_id()
    OR public.current_app_user_is_owner()
  );

DROP POLICY IF EXISTS "orders_manage_owner_or_admin" ON "orders";
CREATE POLICY "orders_manage_owner_or_admin"
  ON "orders"
  FOR ALL
  TO authenticated
  USING (
    "user_id" = public.current_app_user_id()
    OR public.current_app_user_is_owner()
  )
  WITH CHECK (
    "user_id" = public.current_app_user_id()
    OR public.current_app_user_is_owner()
  );

DROP POLICY IF EXISTS "order_items_select_visible_orders" ON "order_items";
CREATE POLICY "order_items_select_visible_orders"
  ON "order_items"
  FOR SELECT
  TO authenticated
  USING (public.can_access_order("order_id"));

DROP POLICY IF EXISTS "order_items_manage_visible_orders" ON "order_items";
CREATE POLICY "order_items_manage_visible_orders"
  ON "order_items"
  FOR ALL
  TO authenticated
  USING (public.can_access_order("order_id"))
  WITH CHECK (public.can_access_order("order_id"));

DROP POLICY IF EXISTS "fuel_requests_select_owner_or_admin" ON "fuel_requests";
CREATE POLICY "fuel_requests_select_owner_or_admin"
  ON "fuel_requests"
  FOR SELECT
  TO authenticated
  USING (
    "user_id" = public.current_app_user_id()
    OR public.current_app_user_is_owner()
  );

DROP POLICY IF EXISTS "fuel_requests_manage_owner_or_admin" ON "fuel_requests";
CREATE POLICY "fuel_requests_manage_owner_or_admin"
  ON "fuel_requests"
  FOR ALL
  TO authenticated
  USING (
    "user_id" = public.current_app_user_id()
    OR public.current_app_user_is_owner()
  )
  WITH CHECK (
    "user_id" = public.current_app_user_id()
    OR public.current_app_user_is_owner()
  );

DROP POLICY IF EXISTS "fuel_request_items_select_visible_requests" ON "fuel_request_items";
CREATE POLICY "fuel_request_items_select_visible_requests"
  ON "fuel_request_items"
  FOR SELECT
  TO authenticated
  USING (public.can_access_fuel_request("fuel_request_id"));

DROP POLICY IF EXISTS "fuel_request_items_manage_visible_requests" ON "fuel_request_items";
CREATE POLICY "fuel_request_items_manage_visible_requests"
  ON "fuel_request_items"
  FOR ALL
  TO authenticated
  USING (public.can_access_fuel_request("fuel_request_id"))
  WITH CHECK (public.can_access_fuel_request("fuel_request_id"));

DROP POLICY IF EXISTS "request_status_events_select_visible_requests" ON "request_status_events";
CREATE POLICY "request_status_events_select_visible_requests"
  ON "request_status_events"
  FOR SELECT
  TO authenticated
  USING (public.can_access_fuel_request("fuel_request_id"));

DROP POLICY IF EXISTS "request_status_events_manage_visible_requests" ON "request_status_events";
CREATE POLICY "request_status_events_manage_visible_requests"
  ON "request_status_events"
  FOR ALL
  TO authenticated
  USING (public.can_access_fuel_request("fuel_request_id"))
  WITH CHECK (public.can_access_fuel_request("fuel_request_id"));

DROP POLICY IF EXISTS "stations_public_read" ON "stations";
CREATE POLICY "stations_public_read"
  ON "stations"
  FOR SELECT
  TO anon, authenticated
  USING ("active" = true);

DROP POLICY IF EXISTS "stations_owner_manage" ON "stations";
CREATE POLICY "stations_owner_manage"
  ON "stations"
  FOR ALL
  TO authenticated
  USING (public.current_app_user_is_owner())
  WITH CHECK (public.current_app_user_is_owner());

DROP POLICY IF EXISTS "station_hours_public_read" ON "station_hours";
CREATE POLICY "station_hours_public_read"
  ON "station_hours"
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "stations" s
      WHERE s."id" = "station_hours"."station_id"
        AND s."active" = true
    )
  );

DROP POLICY IF EXISTS "station_hours_owner_manage" ON "station_hours";
CREATE POLICY "station_hours_owner_manage"
  ON "station_hours"
  FOR ALL
  TO authenticated
  USING (public.current_app_user_is_owner())
  WITH CHECK (public.current_app_user_is_owner());

DROP POLICY IF EXISTS "service_slots_public_read" ON "service_slots";
CREATE POLICY "service_slots_public_read"
  ON "service_slots"
  FOR SELECT
  TO anon, authenticated
  USING (
    "status" = 'open'
    AND "start_at" >= now()
    AND EXISTS (
      SELECT 1
      FROM "stations" s
      WHERE s."id" = "service_slots"."station_id"
        AND s."active" = true
    )
  );

DROP POLICY IF EXISTS "service_slots_owner_manage" ON "service_slots";
CREATE POLICY "service_slots_owner_manage"
  ON "service_slots"
  FOR ALL
  TO authenticated
  USING (public.current_app_user_is_owner())
  WITH CHECK (public.current_app_user_is_owner());

DROP POLICY IF EXISTS "station_fuel_prices_public_read" ON "station_fuel_prices";
CREATE POLICY "station_fuel_prices_public_read"
  ON "station_fuel_prices"
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "stations" s
      WHERE s."id" = "station_fuel_prices"."station_id"
        AND s."active" = true
    )
  );

DROP POLICY IF EXISTS "station_fuel_prices_owner_manage" ON "station_fuel_prices";
CREATE POLICY "station_fuel_prices_owner_manage"
  ON "station_fuel_prices"
  FOR ALL
  TO authenticated
  USING (public.current_app_user_is_owner())
  WITH CHECK (public.current_app_user_is_owner());

DROP POLICY IF EXISTS "store_categories_public_read" ON "store_categories";
CREATE POLICY "store_categories_public_read"
  ON "store_categories"
  FOR SELECT
  TO anon, authenticated
  USING ("active" = true);

DROP POLICY IF EXISTS "store_categories_owner_manage" ON "store_categories";
CREATE POLICY "store_categories_owner_manage"
  ON "store_categories"
  FOR ALL
  TO authenticated
  USING (public.current_app_user_is_owner())
  WITH CHECK (public.current_app_user_is_owner());

DROP POLICY IF EXISTS "store_items_public_read" ON "store_items";
CREATE POLICY "store_items_public_read"
  ON "store_items"
  FOR SELECT
  TO anon, authenticated
  USING (
    "active" = true
    AND EXISTS (
      SELECT 1
      FROM "store_categories" sc
      WHERE sc."id" = "store_items"."category_id"
        AND sc."active" = true
    )
  );

DROP POLICY IF EXISTS "store_items_owner_manage" ON "store_items";
CREATE POLICY "store_items_owner_manage"
  ON "store_items"
  FOR ALL
  TO authenticated
  USING (public.current_app_user_is_owner())
  WITH CHECK (public.current_app_user_is_owner());

DROP POLICY IF EXISTS "station_store_items_public_read" ON "station_store_items";
CREATE POLICY "station_store_items_public_read"
  ON "station_store_items"
  FOR SELECT
  TO anon, authenticated
  USING (
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
  );

DROP POLICY IF EXISTS "station_store_items_owner_manage" ON "station_store_items";
CREATE POLICY "station_store_items_owner_manage"
  ON "station_store_items"
  FOR ALL
  TO authenticated
  USING (public.current_app_user_is_owner())
  WITH CHECK (public.current_app_user_is_owner());
