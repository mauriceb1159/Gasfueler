'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import {
  fuelRequests,
  FuelRequestStatus,
  orders,
  requestStatusEvents
} from '@/lib/db/schema';

export async function cancelFuelRequest(formData: FormData) {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  const requestId = Number(formData.get('requestId'));

  if (!Number.isInteger(requestId) || requestId <= 0) {
    redirect('/dashboard/fulfillment');
  }

  const [request] = await db
    .select({
      id: fuelRequests.id,
      orderId: fuelRequests.orderId,
      status: fuelRequests.status,
      userId: fuelRequests.userId
    })
    .from(fuelRequests)
    .where(eq(fuelRequests.id, requestId))
    .limit(1);

  if (!request) {
    redirect('/dashboard/fulfillment');
  }

  if (
    request.status === FuelRequestStatus.COMPLETED ||
    request.status === FuelRequestStatus.CANCELED
  ) {
    redirect(`/requests/${requestId}`);
  }

  if (user.role !== 'owner' && request.userId !== user.id) {
    redirect(`/requests/${requestId}`);
  }

  await db
    .update(fuelRequests)
    .set({
      status: FuelRequestStatus.CANCELED,
      updatedAt: new Date()
    })
    .where(eq(fuelRequests.id, requestId));

  if (request.orderId) {
    await db
      .update(orders)
      .set({
        status: FuelRequestStatus.CANCELED,
        updatedAt: new Date()
      })
      .where(eq(orders.id, request.orderId));
  }

  await db.insert(requestStatusEvents).values({
    fuelRequestId: requestId,
    status: FuelRequestStatus.CANCELED,
    note: 'Fuel request canceled from the request workflow.',
    createdBy: user.id
  });

  revalidatePath(`/requests/${requestId}`);
  revalidatePath('/dashboard/fulfillment');

  redirect('/dashboard/fulfillment');
}
