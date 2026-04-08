'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/config';

type SupabaseTokenResponse = {
  access_token: string;
  expires_in: number;
};

let cachedClient: SupabaseClient | null = null;
let cachedTokenExpiresAt = 0;

async function fetchSupabaseToken() {
  const response = await fetch('/api/auth/supabase-token', {
    method: 'GET',
    cache: 'no-store',
    credentials: 'include',
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    throw new Error(
      payload?.error ?? 'Unable to fetch a Supabase access token.'
    );
  }

  return (await response.json()) as SupabaseTokenResponse;
}

export async function getSupabaseBrowserClient() {
  const now = Date.now();

  if (cachedClient && now < cachedTokenExpiresAt - 60_000) {
    return cachedClient;
  }

  const { access_token, expires_in } = await fetchSupabaseToken();

  cachedClient = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    },
  });

  cachedTokenExpiresAt = now + expires_in * 1000;

  return cachedClient;
}
