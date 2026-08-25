import { getUser } from '@/lib/db/queries';
import {
  updateAssignedDispatchJobStatus,
  updateDriverJobStatusInputSchema,
} from '@/lib/dispatch-service';

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

  const parsedInput = updateDriverJobStatusInputSchema.safeParse(body);

  if (!parsedInput.success) {
    return Response.json(
      { error: parsedInput.error.errors[0]?.message ?? 'Invalid request.' },
      { status: 400 }
    );
  }

  const result = await updateAssignedDispatchJobStatus(
    jobId,
    parsedInput.data,
    user
  );

  if (!result || 'error' in result) {
    return Response.json(
      result ?? { error: 'Dispatch job could not be found.' },
      { status: 400 }
    );
  }

  return Response.json(result);
}
