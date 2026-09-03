import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import {
  fuelRequests,
  FuelRequestStatus,
  OrderFulfillmentStatus,
  orders,
  requestStatusEvents,
  type User
} from '@/lib/db/schema';

export type DemoFuelPaymentInput = {
  requestId: number;
  cardholderName: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
  zipCode: string;
};

export async function completeDemoFuelPaymentForUser(
  input: DemoFuelPaymentInput,
  user: User
) {
  const cardNumber = input.cardNumber.replace(/\D/g, '');

  if (
    cardNumber.length < 12 ||
    input.cardholderName.trim().length < 2 ||
    input.expiry.trim().length < 4 ||
    input.cvc.trim().length < 3 ||
    input.zipCode.trim().length < 5
  ) {
    return { error: 'Payment details are incomplete.' as const };
  }

  const [request] = await db
    .select({
      id: fuelRequests.id,
      orderId: fuelRequests.orderId,
      status: fuelRequests.status,
      userId: fuelRequests.userId
    })
    .from(fuelRequests)
    .where(and(eq(fuelRequests.id, input.requestId), eq(fuelRequests.userId, user.id)))
    .limit(1);

  if (!request) {
    return { error: 'Fuel request could not be found.' as const };
  }

  if (request.status !== FuelRequestStatus.PENDING_PAYMENT) {
    return {
      requestId: request.id,
      orderId: request.orderId,
      status: request.status,
      alreadyPaid: true as const
    };
  }

  const now = new Date();
  const cardLast4 = cardNumber.slice(-4);

  await db.transaction(async (tx) => {
    await tx
      .update(fuelRequests)
      .set({
        status: FuelRequestStatus.SCHEDULED,
        updatedAt: now
      })
      .where(eq(fuelRequests.id, request.id));

    if (request.orderId) {
      await tx
        .update(orders)
        .set({
          status: OrderFulfillmentStatus.PAID,
          fulfillmentStatus: OrderFulfillmentStatus.PAID,
          updatedAt: now
        })
        .where(eq(orders.id, request.orderId));
    }

    await tx.insert(requestStatusEvents).values({
      fuelRequestId: request.id,
      status: FuelRequestStatus.SCHEDULED,
      note: `Demo payment authorized with placeholder card ending in ${cardLast4}.`,
      createdBy: user.id
    });
  });

  return {
    requestId: request.id,
    orderId: request.orderId,
    status: FuelRequestStatus.SCHEDULED,
    alreadyPaid: false as const
  };
}
