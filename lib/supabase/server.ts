import 'server-only';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function requireEnv(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`${name} is required for Supabase Auth.`);
  }

  return value;
}

export function createSupabaseAuthClient() {
  return createClient(
    requireEnv(supabaseUrl, 'SUPABASE_URL'),
    requireEnv(supabaseAnonKey, 'SUPABASE_ANON_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false
      }
    }
  );
}

export function createSupabaseAdminClient() {
  return createClient(
    requireEnv(supabaseUrl, 'SUPABASE_URL'),
    requireEnv(supabaseServiceRoleKey, 'SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false
      }
    }
  );
}
