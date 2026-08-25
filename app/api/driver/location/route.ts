import { getUser } from '@/lib/db/queries';
import {
  updateDriverLocation,
  updateDriverLocationInputSchema,
} from '@/lib/dispatch-service';

export async function POST(request: Request) {
  const user = await getUser();

  if (!user) {
    return Response.json({ error: 'User is not authenticated.' }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsedInput = updateDriverLocationInputSchema.safeParse(body);

  if (!parsedInput.success) {
    return Response.json(
      { error: parsedInput.error.errors[0]?.message ?? 'Invalid request.' },
      { status: 400 }
    );
  }

  const result = await updateDriverLocation(parsedInput.data, user);

  if ('error' in result) {
    return Response.json(result, { status: 403 });
  }

  return Response.json(result, { status: 201 });
}
