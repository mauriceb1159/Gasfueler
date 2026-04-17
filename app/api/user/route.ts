import { getUser, getVehiclesForUser } from '@/lib/db/queries';
import {
  updateUserProfileForUser,
  updateUserProfileInputSchema
} from '@/lib/user-profile-service';

export async function GET() {
  const user = await getUser();

  if (!user) {
    return Response.json(null);
  }

  const vehicles = user.role === 'end_user' ? await getVehiclesForUser(user.id) : [];
  const primaryVehicle = vehicles[0] ?? null;

  return Response.json({
    ...user,
    primaryVehicle: primaryVehicle
      ? {
          id: primaryVehicle.id,
          nickname: primaryVehicle.nickname,
          make: primaryVehicle.make,
          model: primaryVehicle.model,
          color: primaryVehicle.color,
          licensePlate: primaryVehicle.licensePlate
        }
      : null
  });
}

export async function PATCH(request: Request) {
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

  const parsedInput = updateUserProfileInputSchema.safeParse(body);

  if (!parsedInput.success) {
    return Response.json(
      { error: parsedInput.error.errors[0]?.message ?? 'Invalid request.' },
      { status: 400 }
    );
  }

  try {
    const updatedUser = await updateUserProfileForUser(user, parsedInput.data);

    return Response.json({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to update account right now.'
      },
      { status: 400 }
    );
  }
}
