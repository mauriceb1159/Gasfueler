ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "supabase_auth_user_id" text;

CREATE UNIQUE INDEX IF NOT EXISTS "users_supabase_auth_user_id_unique"
  ON "users" ("supabase_auth_user_id")
  WHERE "supabase_auth_user_id" IS NOT NULL;
