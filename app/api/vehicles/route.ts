import { getUser } from '@/lib/db/queries';
import {
  createVehicleForUser,
  createVehicleInputSchema,
  listVehiclesForUser
} from '@/lib/vehicle-service';

export async function GET() {
  const user = await getUser();

  if (!user) {
    return Response.json({ error: 'User is not authenticated.' }, { status: 401 });
  }

  const vehicles = await listVehiclesForUser(user);
  return Response.json(vehicles);
}

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

  const parsedInput = createVehicleInputSchema.safeParse(body);

  if (!parsedInput.success) {
    return Response.json(
      { error: parsedInput.error.errors[0]?.message ?? 'Invalid request.' },
      { status: 400 }
    );
  }

  const vehicle = await createVehicleForUser(parsedInput.data, user);
  return Response.json(vehicle, { status: 201 });
}
