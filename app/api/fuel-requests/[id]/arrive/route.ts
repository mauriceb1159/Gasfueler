import { getUser } from '@/lib/db/queries';
import { markCustomerArrivedForFuelRequest } from '@/lib/dispatch-service';

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
  const requestId = Number(id);

  if (!Number.isInteger(requestId) || requestId <= 0) {
    return Response.json({ error: 'Invalid fuel request id.' }, { status: 400 });
  }

  const result = await markCustomerArrivedForFuelRequest(requestId, user);

  if ('error' in result) {
    return Response.json(result, { status: 400 });
  }

  return Response.json(result);
}
