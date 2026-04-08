import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { getUser } from '@/lib/db/queries';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/config';
import { createSupabaseAccessToken } from '@/lib/supabase/token';

export async function getSupabaseServerClient() {
  const user = await getUser();

  if (!user) {
    throw new Error('User is not authenticated');
  }

  const accessToken = await createSupabaseAccessToken(user);

  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}
