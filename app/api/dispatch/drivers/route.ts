import { getUser } from '@/lib/db/queries';
import {
  createDriverInputSchema,
  createDriverProfile,
  listDrivers,
} from '@/lib/dispatch-service';

export async function GET() {
  const user = await getUser();

  if (!user) {
    return Response.json({ error: 'User is not authenticated.' }, { status: 401 });
  }

  if (user.role !== 'owner') {
    return Response.json({ error: 'Only owners can manage dispatch drivers.' }, { status: 403 });
  }

  const drivers = await listDrivers();
  return Response.json(drivers);
}

export async function POST(request: Request) {
  const user = await getUser();

  if (!user) {
    return Response.json({ error: 'User is not authenticated.' }, { status: 401 });
  }

  if (user.role !== 'owner') {
    return Response.json({ error: 'Only owners can manage dispatch drivers.' }, { status: 403 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsedInput = createDriverInputSchema.safeParse(body);

  if (!parsedInput.success) {
    return Response.json(
      { error: parsedInput.error.errors[0]?.message ?? 'Invalid request.' },
      { status: 400 }
    );
  }

  const result = await createDriverProfile(parsedInput.data);

  if ('error' in result) {
    return Response.json(result, { status: 400 });
  }

  return Response.json(result, { status: 201 });
}
