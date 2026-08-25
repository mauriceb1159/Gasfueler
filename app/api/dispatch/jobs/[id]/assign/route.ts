import { assignDispatchJob, assignDispatchJobInputSchema } from '@/lib/dispatch-service';
import { getUser } from '@/lib/db/queries';
import { canManageDispatch } from '@/lib/auth/roles';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await getUser();

  if (!user) {
    return Response.json({ error: 'User is not authenticated.' }, { status: 401 });
  }

  if (!canManageDispatch(user.role)) {
    return Response.json({ error: 'Only dispatchers and admins can assign dispatch jobs.' }, { status: 403 });
  }

  const { id } = await context.params;
  const jobId = Number(id);

  if (!Number.isInteger(jobId) || jobId <= 0) {
    return Response.json({ error: 'Invalid dispatch job id.' }, { status: 400 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsedInput = assignDispatchJobInputSchema.safeParse(body);

  if (!parsedInput.success) {
    return Response.json(
      { error: parsedInput.error.errors[0]?.message ?? 'Invalid request.' },
      { status: 400 }
    );
  }

  const result = await assignDispatchJob(jobId, parsedInput.data, user);

  if ('error' in result) {
    return Response.json(result, { status: 400 });
  }

  return Response.json(result);
}
