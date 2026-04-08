import { SignJWT } from 'jose';
import type { User } from '@/lib/db/schema';

const DEFAULT_EXPIRATION_SECONDS = 60 * 60;

function getSupabaseJwtSecret() {
  const secret = process.env.SUPABASE_JWT_SECRET;

  if (!secret) {
    throw new Error(
      'SUPABASE_JWT_SECRET is not configured. Add the project JWT secret from Supabase settings.'
    );
  }

  return new TextEncoder().encode(secret);
}

export async function createSupabaseAccessToken(
  user: Pick<User, 'id' | 'email' | 'role'>,
  expiresInSeconds = DEFAULT_EXPIRATION_SECONDS
) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + expiresInSeconds;

  return new SignJWT({
    aud: 'authenticated',
    role: 'authenticated',
    email: user.email,
    app_user_id: String(user.id),
    user_id: String(user.id),
    app_role: user.role,
    user_role: user.role,
    aal: 'aal1',
    amr: [{ method: 'password', timestamp: now }],
    session_id: `app-session-${user.id}-${now}`,
    is_anonymous: false,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(String(user.id))
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(getSupabaseJwtSecret());
}

export const SUPABASE_ACCESS_TOKEN_TTL_SECONDS = DEFAULT_EXPIRATION_SECONDS;
