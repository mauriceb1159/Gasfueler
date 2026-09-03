import { completeDemoFuelPaymentForUser } from '@/lib/demo-fuel-payment';
import { getUser } from '@/lib/db/queries';

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
  const requestId = Number(id);

  if (!Number.isInteger(requestId) || requestId <= 0) {
    return Response.json({ error: 'Invalid fuel request id.' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const result = await completeDemoFuelPaymentForUser(
    {
      requestId,
      cardholderName: String(body.cardholderName || ''),
      cardNumber: String(body.cardNumber || ''),
      expiry: String(body.expiry || ''),
      cvc: String(body.cvc || ''),
      zipCode: String(body.zipCode || '')
    },
    user
  );

  if ('error' in result) {
    return Response.json(result, { status: 400 });
  }

  return Response.json(result);
}
