import { getUser } from '@/lib/db/queries';
import { acceptAssignedDispatchJob } from '@/lib/dispatch-service';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const user = await getUser();

  if (!user) {
    return Response.json({ error: 'User is not authenticated.' }, { status: 401 });
  }

  const { id } = await context.params;
  const jobId = Number(id);

  if (!Number.isInteger(jobId) || jobId <= 0) {
    return Response.json({ error: 'Invalid dispatch job id.' }, { status: 400 });
  }

  const result = await acceptAssignedDispatchJob(jobId, user);

  if (!result || 'error' in result) {
    return Response.json(
      result ?? { error: 'Dispatch job could not be found.' },
      { status: 400 }
    );
  }

  return Response.json(result);
}
