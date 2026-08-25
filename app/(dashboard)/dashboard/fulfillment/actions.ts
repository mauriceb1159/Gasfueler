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

  if (!(gasCapPhoto instanceof File) || gasCapPhoto.size === 0) {
    return { error: 'Upload a gas cap door secured photo.' };
  }

  const [request] = await db
    .select({
      id: fuelRequests.id,
      orderId: fuelRequests.orderId,
      serviceFee: fuelRequests.serviceFee,
      addonTotal: fuelRequests.addonTotal
    })
    .from(fuelRequests)
    .where(eq(fuelRequests.id, requestId))
    .limit(1);

  if (!request) {
    return { error: 'That fuel request could not be found.' };
  }

  try {
    const [pumpPhotoPath, gasCapPhotoPath] = await Promise.all([
      uploadProofPhoto(requestId, 'pump-screen', pumpPhoto),
      uploadProofPhoto(requestId, 'gas-cap-secured', gasCapPhoto)
    ]);

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
      note: 'Fueling completed with pump screen and gas cap proof photos.',
      createdBy: user.id
    });

    revalidatePath('/dashboard/fulfillment');

    return { success: 'Fuel request completed and proof photos saved.' };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Unable to save fulfillment proof right now.'
    };
  }
}

async function uploadProofPhoto(
  requestId: number,
  photoType: 'pump-screen' | 'gas-cap-secured',
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
