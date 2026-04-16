import { getUser } from '@/lib/db/queries';
import { updateVehicleForUser, updateVehicleInputSchema } from '@/lib/vehicle-service';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getUser();

  if (!user) {
    return Response.json({ error: 'User is not authenticated.' }, { status: 401 });
  }

  const { id } = await context.params;
  const vehicleId = Number(id);

  if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
    return Response.json({ error: 'Invalid vehicle id.' }, { status: 400 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsedInput = updateVehicleInputSchema.safeParse(body);

  if (!parsedInput.success) {
    return Response.json(
      { error: parsedInput.error.errors[0]?.message ?? 'Invalid request.' },
      { status: 400 }
    );
  }

  const vehicle = await updateVehicleForUser(vehicleId, parsedInput.data, user);

  if (!vehicle) {
    return Response.json({ error: 'Vehicle not found.' }, { status: 404 });
  }

  return Response.json(vehicle);
}
