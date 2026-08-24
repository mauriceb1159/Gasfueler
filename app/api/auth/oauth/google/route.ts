import { NextResponse } from 'next/server';

import { createSupabaseAuthClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const callbackUrl = new URL('/api/auth/callback', requestUrl.origin);

  for (const key of ['redirect', 'priceId', 'inviteId']) {
    const value = requestUrl.searchParams.get(key);

    if (value) {
      callbackUrl.searchParams.set(key, value);
    }
  }

  const supabase = createSupabaseAuthClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl.toString()
    }
  });

  if (error || !data.url) {
    return NextResponse.redirect(
      new URL(
        `/sign-in?error=${encodeURIComponent(
          error?.message || 'Unable to start Google sign-in.'
        )}`,
        requestUrl.origin
      )
    );
  }

  return NextResponse.redirect(data.url);
}
