import { createSessionToken, setSession } from '@/lib/auth/session';
import { registerUser, signUpInputSchema } from '@/lib/auth-service';

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    const parsedInput = signUpInputSchema.safeParse(body);

    if (!parsedInput.success) {
      return Response.json(
        { error: parsedInput.error.errors[0]?.message ?? 'Invalid request.' },
        { status: 400 }
      );
    }

    const result = await registerUser(parsedInput.data);

    if ('error' in result) {
      return Response.json(result, { status: 400 });
    }

    await setSession(result.user);
    const { token, expiresAt } = await createSessionToken(result.user);

    return Response.json(
      {
        token,
        expiresAt: expiresAt.toISOString(),
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Sign-up API failed:', error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to sign up right now.'
      },
      { status: 500 }
    );
  }
}
