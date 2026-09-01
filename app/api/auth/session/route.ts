import { getUser } from '@/lib/db/queries';
import { getDriverProfileIdForUser } from '@/lib/auth-service';

export async function GET() {
  const user = await getUser();

  if (!user) {
    return Response.json({ error: 'User is not authenticated.' }, { status: 401 });
  }

  const driverProfileId = await getDriverProfileIdForUser(user.id);

  return Response.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      driverProfileId
    }
  });
}
