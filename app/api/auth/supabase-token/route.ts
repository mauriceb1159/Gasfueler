import { getUser } from '@/lib/db/queries';
import {
  createSupabaseAccessToken,
  SUPABASE_ACCESS_TOKEN_TTL_SECONDS,
} from '@/lib/supabase/token';

export async function GET() {
  const user = await getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const accessToken = await createSupabaseAccessToken(user);

    return Response.json(
      {
        access_token: accessToken,
        token_type: 'bearer',
        expires_in: SUPABASE_ACCESS_TOKEN_TTL_SECONDS,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to create a Supabase access token.',
      },
      { status: 500 }
    );
  }
}
