import { createSessionToken, setSession } from '@/lib/auth/session';
import {
  authenticateUser,
  getDriverProfileIdForUser,
  signInInputSchema
} from '@/lib/auth-service';

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    const parsedInput = signInInputSchema.safeParse(body);

    if (!parsedInput.success) {
      return Response.json(
        { error: parsedInput.error.errors[0]?.message ?? 'Invalid request.' },
        { status: 400 }
      );
    }

    const result = await authenticateUser(parsedInput.data);

    if ('error' in result) {
      return Response.json(result, { status: 401 });
    }

    await setSession(result.user);
    const { token, expiresAt } = await createSessionToken(result.user);
    const driverProfileId = await getDriverProfileIdForUser(result.user.id);

    return Response.json({
      token,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        driverProfileId
      }
    });
  } catch (error) {
    console.error('Sign-in API failed:', error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to sign in right now.'
      },
      { status: 500 }
    );
  }
}
