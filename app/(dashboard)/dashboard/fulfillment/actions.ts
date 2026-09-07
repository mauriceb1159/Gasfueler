'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { canManageFulfillment } from '@/lib/auth/roles';
import { db } from '@/lib/db/drizzle';
import {
  fuelRequests,
  FuelRequestStatus,
  orders,
  requestStatusEvents
} from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';

const proofBucketName = 'fuel-request-proofs';

export async function completeFuelRequestWithProof(
  _prevState: { error?: string; success?: string },
  formData: FormData
) {
  const user = await getUser();

  if (!user) {
    return { error: 'You must be signed in to complete a fuel request.' };
  }

  if (!canManageFulfillment(user.role)) {
    return { error: 'Only station attendants and admins can complete fulfillment proof.' };
  }

  const requestId = Number(formData.get('requestId'));
  const actualGallons = parseDecimalFormValue(formData.get('actualGallons'));
  const actualPricePerGallon = parseDecimalFormValue(
    formData.get('actualPricePerGallon')
  );
  const actualFuelTotal = parseDecimalFormValue(formData.get('actualFuelTotal'));
  const pumpPhoto = formData.get('pumpPhoto');
  const gasCapPhoto = formData.get('gasCapPhoto');
  const tireFrontLeftPhoto = formData.get('tireFrontLeftPhoto');
  const tireFrontRightPhoto = formData.get('tireFrontRightPhoto');
  const tireRearLeftPhoto = formData.get('tireRearLeftPhoto');
  const tireRearRightPhoto = formData.get('tireRearRightPhoto');

  if (!Number.isInteger(requestId) || requestId <= 0) {
    return { error: 'Choose a valid fuel request.' };
  }

  if (!Number.isFinite(actualGallons) || actualGallons <= 0) {
    return { error: 'Enter actual gallons pumped.' };
  }

  if (!Number.isFinite(actualPricePerGallon) || actualPricePerGallon <= 0) {
    return { error: 'Enter the actual price per gallon.' };
  }

  if (!Number.isFinite(actualFuelTotal) || actualFuelTotal <= 0) {
    return { error: 'Enter the actual pump total.' };
  }

  if (!(pumpPhoto instanceof File) || pumpPhoto.size === 0) {
    return { error: 'Upload a pump screen photo.' };
  }

  const [request] = await db
    .select({
      id: fuelRequests.id,
      orderId: fuelRequests.orderId,
      serviceFee: fuelRequests.serviceFee,
      addonTotal: fuelRequests.addonTotal,
      proofPhotoMetadata: fuelRequests.proofPhotoMetadata
    })
    .from(fuelRequests)
    .where(eq(fuelRequests.id, requestId))
    .limit(1);

  if (!request) {
    return { error: 'That fuel request could not be found.' };
  }

  try {
    const [
      pumpPhotoPath,
      gasCapPhotoPath,
      tireFrontLeftPhotoPath,
      tireFrontRightPhotoPath,
      tireRearLeftPhotoPath,
      tireRearRightPhotoPath,
    ] = await Promise.all([
      uploadProofPhoto(requestId, 'pump-screen', pumpPhoto),
      gasCapPhoto instanceof File && gasCapPhoto.size > 0
        ? uploadProofPhoto(requestId, 'gas-cap-secured', gasCapPhoto)
        : Promise.resolve(null),
      tireFrontLeftPhoto instanceof File && tireFrontLeftPhoto.size > 0
        ? uploadProofPhoto(requestId, 'tire-front-left', tireFrontLeftPhoto)
        : Promise.resolve(null),
      tireFrontRightPhoto instanceof File && tireFrontRightPhoto.size > 0
        ? uploadProofPhoto(requestId, 'tire-front-right', tireFrontRightPhoto)
        : Promise.resolve(null),
      tireRearLeftPhoto instanceof File && tireRearLeftPhoto.size > 0
        ? uploadProofPhoto(requestId, 'tire-rear-left', tireRearLeftPhoto)
        : Promise.resolve(null),
      tireRearRightPhoto instanceof File && tireRearRightPhoto.size > 0
        ? uploadProofPhoto(requestId, 'tire-rear-right', tireRearRightPhoto)
        : Promise.resolve(null)
    ]);
    const proofPhotoMetadata = mergeProofPhotoMetadata(
      request.proofPhotoMetadata,
      [
        buildProofPhotoMetadata({
          file: pumpPhoto,
          photoType: 'pump-screen',
          storagePath: pumpPhotoPath,
          requestId,
          uploadedByUserId: user.id,
          uploadedByEmail: user.email,
          source: 'fulfillment_dashboard'
        }),
        gasCapPhotoPath && gasCapPhoto instanceof File
          ? buildProofPhotoMetadata({
              file: gasCapPhoto,
              photoType: 'gas-cap-secured',
              storagePath: gasCapPhotoPath,
              requestId,
              uploadedByUserId: user.id,
              uploadedByEmail: user.email,
              source: 'fulfillment_dashboard'
            })
          : null,
        tireFrontLeftPhotoPath && tireFrontLeftPhoto instanceof File
          ? buildProofPhotoMetadata({
              file: tireFrontLeftPhoto,
              photoType: 'tire-front-left',
              storagePath: tireFrontLeftPhotoPath,
              requestId,
              uploadedByUserId: user.id,
              uploadedByEmail: user.email,
              source: 'fulfillment_dashboard'
            })
          : null,
        tireFrontRightPhotoPath && tireFrontRightPhoto instanceof File
          ? buildProofPhotoMetadata({
              file: tireFrontRightPhoto,
              photoType: 'tire-front-right',
              storagePath: tireFrontRightPhotoPath,
              requestId,
              uploadedByUserId: user.id,
              uploadedByEmail: user.email,
              source: 'fulfillment_dashboard'
            })
          : null,
        tireRearLeftPhotoPath && tireRearLeftPhoto instanceof File
          ? buildProofPhotoMetadata({
              file: tireRearLeftPhoto,
              photoType: 'tire-rear-left',
              storagePath: tireRearLeftPhotoPath,
              requestId,
              uploadedByUserId: user.id,
              uploadedByEmail: user.email,
              source: 'fulfillment_dashboard'
            })
          : null,
        tireRearRightPhotoPath && tireRearRightPhoto instanceof File
          ? buildProofPhotoMetadata({
              file: tireRearRightPhoto,
              photoType: 'tire-rear-right',
              storagePath: tireRearRightPhotoPath,
              requestId,
              uploadedByUserId: user.id,
              uploadedByEmail: user.email,
              source: 'fulfillment_dashboard'
            })
          : null
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
        totalEstimate:
          actualFuelTotalCents + request.serviceFee + request.addonTotal,
        pumpPhotoUrl: pumpPhotoPath,
        gasCapPhotoUrl: gasCapPhotoPath,
        tireFrontLeftPhotoUrl: tireFrontLeftPhotoPath,
        tireFrontRightPhotoUrl: tireFrontRightPhotoPath,
        tireRearLeftPhotoUrl: tireRearLeftPhotoPath,
        tireRearRightPhotoUrl: tireRearRightPhotoPath,
        proofPhotoMetadata,
        completedAt: new Date(),
        status: FuelRequestStatus.COMPLETED,
        updatedAt: new Date()
      })
      .where(eq(fuelRequests.id, requestId));

    if (request.orderId) {
      await db
        .update(orders)
        .set({
          status: FuelRequestStatus.COMPLETED,
          fuelSubtotal: actualFuelTotalCents,
          storeSubtotal: request.addonTotal,
          serviceFee: request.serviceFee,
          taxTotal: 0,
          totalAmount:
            actualFuelTotalCents + request.serviceFee + request.addonTotal,
          updatedAt: new Date()
        })
        .where(eq(orders.id, request.orderId));
    }

    await db.insert(requestStatusEvents).values({
      fuelRequestId: requestId,
      status: FuelRequestStatus.COMPLETED,
      note: gasCapPhotoPath
        ? 'Fueling completed with pump screen and gas cap proof photos.'
        : 'Fueling completed with pump screen proof photo.',
      createdBy: user.id
    });

    revalidatePath('/dashboard/fulfillment');

    return { success: 'Fuel request completed and proof saved.' };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Unable to save fulfillment proof right now.'
    };
  }
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
  uploadedByUserId,
  uploadedByEmail,
  source
}: {
  file: File;
  photoType: string;
  storagePath: string;
  requestId: number;
  uploadedByUserId: number;
  uploadedByEmail: string;
  source: 'fulfillment_dashboard';
}) {
  return {
    photoType,
    storagePath,
    uploadedAt: new Date().toISOString(),
    uploadedByUserId,
    uploadedByEmail,
    fuelRequestId: requestId,
    source,
    originalFilename: file.name || null,
    contentType: file.type || null,
    sizeBytes: file.size
  };
}

async function uploadProofPhoto(
  requestId: number,
  photoType:
    | 'pump-screen'
    | 'gas-cap-secured'
    | 'tire-front-left'
    | 'tire-front-right'
    | 'tire-rear-left'
    | 'tire-rear-right',
  file: File
) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Supabase Storage is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('Proof uploads must be image files.');
  }

  if (file.size > 8 * 1024 * 1024) {
    throw new Error('Proof photos must be smaller than 8 MB.');
  }

  const extension = getSafeFileExtension(file);
  const objectPath = `fuel-requests/${requestId}/${photoType}-${Date.now()}.${extension}`;
  const uploadUrl = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/${proofBucketName}/${objectPath}`;

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      'content-type': file.type,
      'x-upsert': 'true'
    },
    body: Buffer.from(await file.arrayBuffer())
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Supabase Storage upload failed for ${photoType}: ${errorText}`
    );
  }

  return `${proofBucketName}/${objectPath}`;
}

function getSafeFileExtension(file: File) {
  const extensionFromName = file.name.split('.').pop()?.toLowerCase();

  if (extensionFromName && /^[a-z0-9]+$/.test(extensionFromName)) {
    return extensionFromName;
  }

  return file.type === 'image/png' ? 'png' : 'jpg';
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
