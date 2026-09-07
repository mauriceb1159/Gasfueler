import { and, desc, eq, inArray } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { getUser } from '@/lib/db/queries';
import {
  dispatchAssignments,
  dispatchEvents,
  dispatchJobs,
  DispatchAssignmentStatus,
  DispatchJobStatus,
  DriverAvailabilityStatus,
  driverLocations,
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
  const tireFrontLeftPhoto = formData.get('tireFrontLeftPhoto');
  const tireFrontRightPhoto = formData.get('tireFrontRightPhoto');
  const tireRearLeftPhoto = formData.get('tireRearLeftPhoto');
  const tireRearRightPhoto = formData.get('tireRearRightPhoto');

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
      proofPhotoMetadata: fuelRequests.proofPhotoMetadata,
    })
    .from(fuelRequests)
    .where(eq(fuelRequests.id, job.fuelRequestId))
    .limit(1);

  if (!fuelRequest) {
    return Response.json({ error: 'Fuel request could not be found.' }, { status: 404 });
  }

  try {
    const [
      gasCapBeforePhotoPath,
      gasCapAfterPhotoPath,
      pumpPhotoPath,
      receiptPhotoPath,
      tireFrontLeftPhotoPath,
      tireFrontRightPhotoPath,
      tireRearLeftPhotoPath,
      tireRearRightPhotoPath,
    ] = await Promise.all([
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
        tireFrontLeftPhoto instanceof File && tireFrontLeftPhoto.size > 0
          ? uploadProofPhoto(fuelRequest.id, 'tire-front-left', tireFrontLeftPhoto)
          : Promise.resolve(null),
        tireFrontRightPhoto instanceof File && tireFrontRightPhoto.size > 0
          ? uploadProofPhoto(fuelRequest.id, 'tire-front-right', tireFrontRightPhoto)
          : Promise.resolve(null),
        tireRearLeftPhoto instanceof File && tireRearLeftPhoto.size > 0
          ? uploadProofPhoto(fuelRequest.id, 'tire-rear-left', tireRearLeftPhoto)
          : Promise.resolve(null),
        tireRearRightPhoto instanceof File && tireRearRightPhoto.size > 0
          ? uploadProofPhoto(fuelRequest.id, 'tire-rear-right', tireRearRightPhoto)
          : Promise.resolve(null),
      ]);
    const latestDriverLocation = await getLatestDriverLocation(driver.id);
    const proofPhotoMetadata = mergeProofPhotoMetadata(
      fuelRequest.proofPhotoMetadata,
      [
        gasCapBeforePhotoPath && gasCapBeforePhoto instanceof File
          ? buildProofPhotoMetadata({
              file: gasCapBeforePhoto,
              photoType: 'gas-cap-before',
              storagePath: gasCapBeforePhotoPath,
              requestId: fuelRequest.id,
              dispatchJobId: jobId,
              uploadedByUserId: user.id,
              uploadedByEmail: user.email,
              driverId: driver.id,
              source: 'driver_app',
              latestDriverLocation,
            })
          : null,
        gasCapAfterPhotoPath && gasCapAfterPhoto instanceof File
          ? buildProofPhotoMetadata({
              file: gasCapAfterPhoto,
              photoType: 'gas-cap-secured',
              storagePath: gasCapAfterPhotoPath,
              requestId: fuelRequest.id,
              dispatchJobId: jobId,
              uploadedByUserId: user.id,
              uploadedByEmail: user.email,
              driverId: driver.id,
              source: 'driver_app',
              latestDriverLocation,
            })
          : null,
        buildProofPhotoMetadata({
          file: pumpPhoto,
          photoType: 'pump-screen',
          storagePath: pumpPhotoPath,
          requestId: fuelRequest.id,
          dispatchJobId: jobId,
          uploadedByUserId: user.id,
          uploadedByEmail: user.email,
          driverId: driver.id,
          source: 'driver_app',
          latestDriverLocation,
        }),
        receiptPhotoPath && receiptPhoto instanceof File
          ? buildProofPhotoMetadata({
              file: receiptPhoto,
              photoType: 'receipt',
              storagePath: receiptPhotoPath,
              requestId: fuelRequest.id,
              dispatchJobId: jobId,
              uploadedByUserId: user.id,
              uploadedByEmail: user.email,
              driverId: driver.id,
              source: 'driver_app',
              latestDriverLocation,
            })
          : null,
        tireFrontLeftPhotoPath && tireFrontLeftPhoto instanceof File
          ? buildProofPhotoMetadata({
              file: tireFrontLeftPhoto,
              photoType: 'tire-front-left',
              storagePath: tireFrontLeftPhotoPath,
              requestId: fuelRequest.id,
              dispatchJobId: jobId,
              uploadedByUserId: user.id,
              uploadedByEmail: user.email,
              driverId: driver.id,
              source: 'driver_app',
              latestDriverLocation,
            })
          : null,
        tireFrontRightPhotoPath && tireFrontRightPhoto instanceof File
          ? buildProofPhotoMetadata({
              file: tireFrontRightPhoto,
              photoType: 'tire-front-right',
              storagePath: tireFrontRightPhotoPath,
              requestId: fuelRequest.id,
              dispatchJobId: jobId,
              uploadedByUserId: user.id,
              uploadedByEmail: user.email,
              driverId: driver.id,
              source: 'driver_app',
              latestDriverLocation,
            })
          : null,
        tireRearLeftPhotoPath && tireRearLeftPhoto instanceof File
          ? buildProofPhotoMetadata({
              file: tireRearLeftPhoto,
              photoType: 'tire-rear-left',
              storagePath: tireRearLeftPhotoPath,
              requestId: fuelRequest.id,
              dispatchJobId: jobId,
              uploadedByUserId: user.id,
              uploadedByEmail: user.email,
              driverId: driver.id,
              source: 'driver_app',
              latestDriverLocation,
            })
          : null,
        tireRearRightPhotoPath && tireRearRightPhoto instanceof File
          ? buildProofPhotoMetadata({
              file: tireRearRightPhoto,
              photoType: 'tire-rear-right',
              storagePath: tireRearRightPhotoPath,
              requestId: fuelRequest.id,
              dispatchJobId: jobId,
              uploadedByUserId: user.id,
              uploadedByEmail: user.email,
              driverId: driver.id,
              source: 'driver_app',
              latestDriverLocation,
            })
          : null,
      ]
    );

    const actualFuelTotalCents = Math.round(actualFuelTotal * 100);

    await db
      .update(fuelRequests)
      .set({
        actualGallons: Math.round(actualGallons * 1000),
        actualPricePerGallon: Math.round(actualPricePerGallon * 100),
        actualFuelTotal: actualFuelTotalCents,
        fuelEstimate: actualFuelTotalCents,
        totalEstimate: actualFuelTotalCents + fuelRequest.serviceFee + fuelRequest.addonTotal,
        ...(gasCapBeforePhotoPath
          ? { gasCapBeforePhotoUrl: gasCapBeforePhotoPath }
          : {}),
        gasCapAfterPhotoUrl: gasCapAfterPhotoPath,
        gasCapPhotoUrl: gasCapAfterPhotoPath,
        pumpPhotoUrl: pumpPhotoPath,
        receiptPhotoUrl: receiptPhotoPath,
        tireFrontLeftPhotoUrl: tireFrontLeftPhotoPath,
        tireFrontRightPhotoUrl: tireFrontRightPhotoPath,
        tireRearLeftPhotoUrl: tireRearLeftPhotoPath,
        tireRearRightPhotoUrl: tireRearRightPhotoPath,
        proofPhotoMetadata,
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
        hasTireVisualCheckPhotos: Boolean(
          tireFrontLeftPhotoPath ||
            tireFrontRightPhotoPath ||
            tireRearLeftPhotoPath ||
            tireRearRightPhotoPath
        ),
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

async function getLatestDriverLocation(driverId: number) {
  const [location] = await db
    .select({
      latitude: driverLocations.latitude,
      longitude: driverLocations.longitude,
      heading: driverLocations.heading,
      speed: driverLocations.speed,
      capturedAt: driverLocations.capturedAt,
    })
    .from(driverLocations)
    .where(eq(driverLocations.driverId, driverId))
    .orderBy(desc(driverLocations.capturedAt))
    .limit(1);

  return location ?? null;
}

function mergeProofPhotoMetadata(
  existingMetadata: unknown,
  metadataEntries: (ReturnType<typeof buildProofPhotoMetadata> | null)[]
) {
  const merged =
    existingMetadata &&
    typeof existingMetadata === 'object' &&
    !Array.isArray(existingMetadata)
      ? { ...(existingMetadata as Record<string, unknown>) }
      : {};

  for (const metadata of metadataEntries) {
    if (metadata) {
      merged[metadata.photoType] = metadata;
    }
  }

  return merged;
}

function buildProofPhotoMetadata({
  file,
  photoType,
  storagePath,
  requestId,
  dispatchJobId,
  uploadedByUserId,
  uploadedByEmail,
  driverId,
  source,
  latestDriverLocation,
}: {
  file: File;
  photoType: string;
  storagePath: string;
  requestId: number;
  dispatchJobId: number;
  uploadedByUserId: number;
  uploadedByEmail: string;
  driverId: number;
  source: 'driver_app';
  latestDriverLocation: Awaited<ReturnType<typeof getLatestDriverLocation>>;
}) {
  return {
    photoType,
    storagePath,
    uploadedAt: new Date().toISOString(),
    uploadedByUserId,
    uploadedByEmail,
    driverId,
    dispatchJobId,
    fuelRequestId: requestId,
    source,
    originalFilename: file.name || null,
    contentType: file.type || null,
    sizeBytes: file.size,
    latestDriverLocation: latestDriverLocation
      ? {
          latitude: latestDriverLocation.latitude,
          longitude: latestDriverLocation.longitude,
          heading: latestDriverLocation.heading,
          speed: latestDriverLocation.speed,
          capturedAt: latestDriverLocation.capturedAt.toISOString(),
        }
      : null,
  };
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
