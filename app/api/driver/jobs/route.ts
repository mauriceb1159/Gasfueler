import { getUser } from '@/lib/db/queries';
import { listAssignedDispatchJobsForDriver } from '@/lib/dispatch-service';

export async function GET() {
  const user = await getUser();

  if (!user) {
    return Response.json({ error: 'User is not authenticated.' }, { status: 401 });
  }

  const result = await listAssignedDispatchJobsForDriver(user);

  if ('error' in result) {
    return Response.json(result, { status: 403 });
  }

  return Response.json(result);
}
