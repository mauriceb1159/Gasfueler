import { getUser } from '@/lib/db/queries';
import { canManageDispatch } from '@/lib/auth/roles';
import {
  createDispatchJob,
  createDispatchJobInputSchema,
  listDispatchJobs,
} from '@/lib/dispatch-service';

export async function GET() {
  const user = await getUser();

  if (!user) {
    return Response.json({ error: 'User is not authenticated.' }, { status: 401 });
  }

  if (!canManageDispatch(user.role)) {
    return Response.json({ error: 'Only dispatchers and admins can manage dispatch jobs.' }, { status: 403 });
  }

  const jobs = await listDispatchJobs();
  return Response.json(jobs);
}

export async function POST(request: Request) {
  const user = await getUser();

  if (!user) {
    return Response.json({ error: 'User is not authenticated.' }, { status: 401 });
  }

  if (!canManageDispatch(user.role)) {
    return Response.json({ error: 'Only dispatchers and admins can manage dispatch jobs.' }, { status: 403 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsedInput = createDispatchJobInputSchema.safeParse(body);

  if (!parsedInput.success) {
    return Response.json(
      { error: parsedInput.error.errors[0]?.message ?? 'Invalid request.' },
      { status: 400 }
    );
  }

  const result = await createDispatchJob(parsedInput.data, user);

  if ('error' in result) {
    return Response.json(result, { status: 400 });
  }

  return Response.json(result, { status: 201 });
}
