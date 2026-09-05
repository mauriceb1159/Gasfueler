import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { getUser } from '@/lib/db/queries';
import {
  dispatchAssignments,
  dispatchEvents,
  dispatchJobs,
  DispatchAssignmentStatus,
  DispatchJobStatus,
  DriverAvailabilityStatus,
  drivers,
  FuelRequestStatus,
  fuelRequests,
  orders,
} from '@/lib/db/schema';
import { notifyDriverStatusUpdated } from '@/lib/notifications/dispatch-notifications';

const proofBucketName = 'fuel-request-proofs';

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

  const [driver] = await db
    .select()
    .from(drivers)
    .where(and(eq(drivers.userId, user.id), eq(drivers.active, true)))
    .limit(1);

  if (!driver) {
    return Response.json({ error: 'Active driver profile could not be found.' }, { status: 403 });
  }

  const [assignment] = await db
    .select({ id: dispatchAssignments.id })
    .from(dispatchAssignments)
    .where(
      and(
        eq(dispatchAssignments.dispatchJobId, jobId),
        eq(dispatchAssignments.driverId, driver.id),
        inArray(dispatchAssignments.assignmentStatus, [
          DispatchAssignmentStatus.ACCEPTED,
          DispatchAssignmentStatus.ASSIGNED,
        ])
      )
    )
    .limit(1);

  if (!assignment) {
    return Response.json({ error: 'Assigned dispatch job could not be found.' }, { status: 404 });
  }

  const [job] = await db
    .select({
      id: dispatchJobs.id,
      fuelRequestId: dispatchJobs.fuelRequestId,
    })
    .from(dispatchJobs)
    .where(eq(dispatchJobs.id, jobId))
    .limit(1);

  if (!job?.fuelRequestId) {
    return Response.json({ error: 'This dispatch job is not linked to a fuel request.' }, { status: 400 });
  }

  const formData = await request.formData();
  const actualGallons = parseDecimalFormValue(formData.get('actualGallons'));
  const actualPricePerGallon = parseDecimalFormValue(formData.get('actualPricePerGallon'));
  const actualFuelTotal = parseDecimalFormValue(formData.get('actualFuelTotal'));
  const gasCapBeforePhoto = formData.get('gasCapBeforePhoto');
  const gasCapAfterPhoto = formData.get('gasCapAfterPhoto');
  const pumpPhoto = formData.get('pumpPhoto');
  const receiptPhoto = formData.get('receiptPhoto');

  if (!Number.isFinite(actualGallons) || actualGallons <= 0) {
    return Response.json({ error: 'Enter actual gallons pumped.' }, { status: 400 });
  }

  if (!Number.isFinite(actualPricePerGallon) || actualPricePerGallon <= 0) {
    return Response.json({ error: 'Enter the actual price per gallon.' }, { status: 400 });
  }

  if (!Number.isFinite(actualFuelTotal) || actualFuelTotal <= 0) {
    return Response.json({ error: 'Enter the actual pump total.' }, { status: 400 });
  }

  if (!(pumpPhoto instanceof File) || pumpPhoto.size === 0) {
    return Response.json({ error: 'Take a pump display photo.' }, { status: 400 });
  }

  if (receiptPhoto !== null && (!(receiptPhoto instanceof File) || receiptPhoto.size === 0)) {
    return Response.json({ error: 'Receipt proof must be a photo.' }, { status: 400 });
  }

  const [fuelRequest] = await db
    .select({
      id: fuelRequests.id,
      orderId: fuelRequests.orderId,
      serviceFee: fuelRequests.serviceFee,
      addonTotal: fuelRequests.addonTotal,
    })
    .from(fuelRequests)
    .where(eq(fuelRequests.id, job.fuelRequestId))
    .limit(1);

  if (!fuelRequest) {
    return Response.json({ error: 'Fuel request could not be found.' }, { status: 404 });
  }

  try {
    const [gasCapBeforePhotoPath, gasCapAfterPhotoPath, pumpPhotoPath, receiptPhotoPath] =
      await Promise.all([
        gasCapBeforePhoto instanceof File && gasCapBeforePhoto.size > 0
          ? uploadProofPhoto(fuelRequest.id, 'gas-cap-before', gasCapBeforePhoto)
          : Promise.resolve(null),
        gasCapAfterPhoto instanceof File && gasCapAfterPhoto.size > 0
          ? uploadProofPhoto(fuelRequest.id, 'gas-cap-secured', gasCapAfterPhoto)
          : Promise.resolve(null),
        uploadProofPhoto(fuelRequest.id, 'pump-screen', pumpPhoto),
        receiptPhoto instanceof File
          ? uploadProofPhoto(fuelRequest.id, 'receipt', receiptPhoto)
          : Promise.resolve(null),
      ]);

    const actualFuelTotalCents = Math.round(actualFuelTotal * 100);

    await db
      .update(fuelRequests)
      .set({
        actualGallons: Math.round(actualGallons * 1000),
        actualPricePerGallon: Math.round(actualPricePerGallon * 100),
        actualFuelTotal: actualFuelTotalCents,
        fuelEstimate: actualFuelTotalCents,
        totalEstimate: actualFuelTotalCents + fuelRequest.serviceFee + fuelRequest.addonTotal,
        gasCapBeforePhotoUrl: gasCapBeforePhotoPath,
        gasCapAfterPhotoUrl: gasCapAfterPhotoPath,
        gasCapPhotoUrl: gasCapAfterPhotoPath,
        pumpPhotoUrl: pumpPhotoPath,
        receiptPhotoUrl: receiptPhotoPath,
        completedAt: new Date(),
        status: FuelRequestStatus.COMPLETED,
        updatedAt: new Date(),
      })
      .where(eq(fuelRequests.id, fuelRequest.id));

    if (fuelRequest.orderId) {
      await db
        .update(orders)
        .set({
          status: FuelRequestStatus.COMPLETED,
          fuelSubtotal: actualFuelTotalCents,
          storeSubtotal: fuelRequest.addonTotal,
          serviceFee: fuelRequest.serviceFee,
          taxTotal: 0,
          totalAmount: actualFuelTotalCents + fuelRequest.serviceFee + fuelRequest.addonTotal,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, fuelRequest.orderId));
    }

    await db
      .update(dispatchJobs)
      .set({
        status: DispatchJobStatus.COMPLETED,
        updatedAt: new Date(),
      })
      .where(eq(dispatchJobs.id, jobId));

    await db
      .update(drivers)
      .set({
        availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
        updatedAt: new Date(),
      })
      .where(eq(drivers.id, driver.id));

    await db.insert(dispatchEvents).values({
      dispatchJobId: jobId,
      actorUserId: user.id,
      eventType: 'driver_proof_completed',
      payload: {
        driverId: driver.id,
        fuelRequestId: fuelRequest.id,
        hasReceiptPhoto: Boolean(receiptPhotoPath),
      },
    });

    await notifyDriverStatusUpdated(jobId, DispatchJobStatus.COMPLETED);

    const completedJob = await db.query.dispatchJobs.findFirst({
      where: eq(dispatchJobs.id, jobId),
      with: {
        customerUser: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        station: {
          columns: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true,
            latitude: true,
            longitude: true,
          },
        },
        assignments: {
          with: {
            driver: {
              columns: {
                id: true,
                availabilityStatus: true,
              },
              with: {
                user: {
                  columns: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return Response.json(completedJob);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to save driver proof right now.',
      },
      { status: 500 }
    );
  }
}

async function uploadProofPhoto(requestId: number, photoType: string, file: File) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Supabase Storage is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  const extension = getSafeFileExtension(file);

  if (!file.type.startsWith('image/') && !extension) {
    throw new Error('Proof uploads must be image files.');
  }

  if (file.size > 8 * 1024 * 1024) {
    throw new Error('Proof photos must be smaller than 8 MB.');
  }

  const safeExtension = extension ?? 'jpg';
  const objectPath = `fuel-requests/${requestId}/${photoType}-${Date.now()}.${safeExtension}`;
  const uploadUrl = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/${proofBucketName}/${objectPath}`;

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      'content-type': file.type.startsWith('image/') ? file.type : 'image/jpeg',
      'x-upsert': 'true',
    },
    body: Buffer.from(await file.arrayBuffer()),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase Storage upload failed for ${photoType}: ${errorText}`);
  }

  return `${proofBucketName}/${objectPath}`;
}

function getSafeFileExtension(file: File) {
  const extensionFromName = file.name.split('.').pop()?.toLowerCase();

  if (
    extensionFromName &&
    ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(extensionFromName)
  ) {
    return extensionFromName;
  }

  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/heic') return 'heic';
  if (file.type === 'image/jpeg') return 'jpg';

  return null;
}

function parseDecimalFormValue(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') {
    return Number.NaN;
  }

  const normalizedValue = value.trim().replace(/[$,]/g, '');

  if (!normalizedValue) {
    return Number.NaN;
  }

  return Number(normalizedValue);
}
