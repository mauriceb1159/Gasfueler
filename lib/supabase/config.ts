export function getSupabaseUrl() {
  const value = process.env.SUPABASE_URL;

  if (!value) {
    throw new Error('SUPABASE_URL is not configured.');
  }

  return value;
}

export function getSupabaseAnonKey() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!value) {
    throw new Error(
      'SUPABASE_ANON_KEY is not configured. Add it to your environment variables.'
    );
  }

  return value;
}
