import { NextResponse } from 'next/server';

import { getPostAuthRedirectForRole, type UserRole } from '@/lib/auth/roles';
import { setSession } from '@/lib/auth/session';
import { getOrCreateApplicationUserForSupabaseIdentity } from '@/lib/auth-service';
import { createSupabaseAuthClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/sign-in', requestUrl.origin));
  }

  const supabase = createSupabaseAuthClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(
      new URL(
        `/sign-in?error=${encodeURIComponent(
          error?.message || 'Unable to finish sign-in.'
        )}`,
        requestUrl.origin
      )
    );
  }

  const { user } = await getOrCreateApplicationUserForSupabaseIdentity(data.user, {
    inviteId: requestUrl.searchParams.get('inviteId') || undefined
  });

  await setSession(user);

  const redirectTo = requestUrl.searchParams.get('redirect');

  return NextResponse.redirect(
    new URL(
      getPostAuthRedirectForRole(user.role as UserRole, redirectTo),
      requestUrl.origin
    )
  );
}
