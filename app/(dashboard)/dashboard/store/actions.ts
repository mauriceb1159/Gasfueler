'use server';

import { and, eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { canManageStoreCatalog } from '@/lib/auth/roles';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import {
  activityLogs,
  stationStoreItems,
  storeCategories,
  storeItems,
  teamMembers
} from '@/lib/db/schema';

const storeImagesBucketName = 'store-images';

type StoreImportReview = {
  kind: 'csv' | 'images' | 'station-csv';
  mode: 'preview' | 'result';
  title: string;
  summary: string;
  lines: string[];
};

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function parseCurrencyToCents(value: string) {
  const parsed = Number(value.trim());

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed * 100);
}

function getCheckedValue(formData: FormData, key: string) {
  return formData.get(key) === 'on';
}

function getImageFile(formData: FormData, key: string) {
  const value = formData.get(key);

  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  return value;
}

function parseCsvRow(line: string) {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (character === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += character;
  }

  values.push(current.trim());
  return values;
}

function normalizeCsvHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function parseCsvBoolean(value: string | undefined, fallback = true) {
  if (!value || !value.trim()) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  return ['true', '1', 'yes', 'y', 'active'].includes(normalized);
}

function stripWrappedQuotes(value: string | undefined) {
  if (!value) {
    return '';
  }

  const trimmed = value.trim();

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/""/g, '"').trim();
  }

  return trimmed;
}

function getSafeFileExtension(file: File) {
  const extensionFromName = file.name.split('.').pop()?.toLowerCase();

  if (
    extensionFromName &&
    ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(extensionFromName)
  ) {
    return extensionFromName === 'jpeg' ? 'jpg' : extensionFromName;
  }

  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/gif') return 'gif';
  if (file.type === 'image/svg+xml') return 'svg';

  return 'jpg';
}

async function saveStoreImage(file: File, slugSeed: string) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    redirectWithMessage(
      'Supabase Storage is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      'error'
    );
  }

  if (!file.type.startsWith('image/')) {
    redirectWithMessage('Store uploads must be image files.', 'error');
  }

  if (file.size > 8 * 1024 * 1024) {
    redirectWithMessage('Store images must be smaller than 8 MB.', 'error');
  }

  const extension = getSafeFileExtension(file);
  const objectPath = `catalog/${toSlug(slugSeed) || 'store-item'}-${Date.now()}.${extension}`;
  const uploadUrl = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/${storeImagesBucketName}/${objectPath}`;

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
    redirectWithMessage(
      `Supabase Storage upload failed for store image: ${errorText}`,
      'error'
    );
  }

  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${storeImagesBucketName}/${objectPath}`;
}

async function requireOwner() {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!canManageStoreCatalog(user.role)) {
    redirect('/dashboard/store?error=Only store admins can manage the store catalog.');
  }

  return user;
}

function redirectWithMessage(
  message: string,
  type: 'success' | 'error'
): never {
  redirect(`/dashboard/store?${type}=${encodeURIComponent(message)}`);
}

function redirectWithReview(review: StoreImportReview): never {
  const encodedReview = Buffer.from(JSON.stringify(review), 'utf8').toString('base64url');
  redirect(`/dashboard/store?review=${encodeURIComponent(encodedReview)}`);
}

function revalidateStorefrontViews() {
  revalidatePath('/market');
  revalidatePath('/book');
}

async function recordStoreActivity(userId: number, action: string) {
  const membership = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, userId),
    columns: {
      teamId: true
    }
  });

  if (!membership) {
    return;
  }

  await db.insert(activityLogs).values({
    teamId: membership.teamId,
    userId,
    action
  });
}

export async function createStoreCategory(formData: FormData) {
  await requireOwner();

  const name = String(formData.get('name') || '').trim();
  const slugInput = String(formData.get('slug') || '').trim();
  const sortOrderValue = String(formData.get('sortOrder') || '0').trim();
  const sortOrder = Number(sortOrderValue);

  if (name.length < 2) {
    redirectWithMessage('Category name must be at least 2 characters.', 'error');
  }

  const slug = toSlug(slugInput || name);

  if (!slug) {
    redirectWithMessage('Enter a valid category slug.', 'error');
  }

  const [existingCategory] = await db
    .select({ id: storeCategories.id })
    .from(storeCategories)
    .where(eq(storeCategories.slug, slug))
    .limit(1);

  if (existingCategory) {
    redirectWithMessage('That category slug already exists.', 'error');
  }

  await db.insert(storeCategories).values({
    name,
    slug,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    active: true
  });

  revalidateStorefrontViews();
  redirectWithMessage(`Created ${name}.`, 'success');
}

export async function createStoreProduct(formData: FormData) {
  await requireOwner();

  const name = String(formData.get('name') || '').trim();
  const slugInput = String(formData.get('slug') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const imageUrlInput = String(formData.get('imageUrl') || '').trim();
  const categoryId = Number(formData.get('categoryId'));
  const basePriceCents = parseCurrencyToCents(String(formData.get('basePrice') || ''));

  if (name.length < 2) {
    redirectWithMessage('Product name must be at least 2 characters.', 'error');
  }

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    redirectWithMessage('Choose a category for the product.', 'error');
  }

  if (basePriceCents === null) {
    redirectWithMessage('Enter a valid base price.', 'error');
  }

  const slug = toSlug(slugInput || name);

  if (!slug) {
    redirectWithMessage('Enter a valid product slug.', 'error');
  }

  const [existingProduct] = await db
    .select({ id: storeItems.id })
    .from(storeItems)
    .where(eq(storeItems.slug, slug))
    .limit(1);

  if (existingProduct) {
    redirectWithMessage('That product slug already exists.', 'error');
  }

  const uploadedImage = getImageFile(formData, 'imageFile');
  const imageUrl = uploadedImage
    ? await saveStoreImage(uploadedImage, slug)
    : imageUrlInput || null;

  await db.insert(storeItems).values({
    categoryId,
    name,
    slug,
    description: description || null,
    imageUrl,
    basePriceCents,
    active: getCheckedValue(formData, 'active')
  });

  revalidateStorefrontViews();
  redirectWithMessage(`Created ${name}.`, 'success');
}

export async function importStoreProductsCsv(formData: FormData) {
  const user = await requireOwner();
  const mode = String(formData.get('mode') || 'import');

  const csvFile = formData.get('csvFile');

  if (!(csvFile instanceof File) || csvFile.size === 0) {
    redirectWithMessage('Choose a CSV file to import.', 'error');
  }

  if (!csvFile.name.toLowerCase().endsWith('.csv')) {
    redirectWithMessage('Bulk product import only accepts CSV files.', 'error');
  }

  const csvText = String(await csvFile.text()).replace(/^\uFEFF/, '');
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    redirectWithMessage('CSV import needs a header row and at least one product row.', 'error');
  }

  const headerColumns = parseCsvRow(lines[0]).map(normalizeCsvHeader);
  const requiredHeaders = ['name', 'slug', 'category', 'baseprice'];
  const missingHeaders = requiredHeaders.filter((header) => !headerColumns.includes(header));

  if (missingHeaders.length > 0) {
    redirectWithMessage(
      `CSV is missing required columns: ${missingHeaders.join(', ')}.`,
      'error'
    );
  }

  const categories = await db.query.storeCategories.findMany({
    columns: {
      id: true,
      name: true,
      slug: true
    }
  });

  const categoryLookup = new Map<string, number>();
  for (const category of categories) {
    categoryLookup.set(category.slug.toLowerCase(), category.id);
    categoryLookup.set(category.name.toLowerCase(), category.id);
  }

  const existingProducts = await db.query.storeItems.findMany({
    columns: {
      id: true,
      slug: true
    }
  });

  const existingProductsBySlug = new Map(
    existingProducts.map((product) => [product.slug.toLowerCase(), product.id])
  );

  const errors: string[] = [];
  const previewLines: string[] = [];
  const rowsToCreate: Array<{
    categoryId: number;
    name: string;
    slug: string;
    description: string | null;
    imageUrl: string | null;
    basePriceCents: number;
    active: boolean;
  }> = [];
  const rowsToUpdate: Array<{
    id: number;
    categoryId: number;
    name: string;
    slug: string;
    description: string | null;
    imageUrl: string | null;
    basePriceCents: number;
    active: boolean;
  }> = [];

  for (let rowIndex = 1; rowIndex < lines.length; rowIndex += 1) {
    const rawValues = parseCsvRow(lines[rowIndex]);
    const getValue = (header: string) => {
      const columnIndex = headerColumns.indexOf(header);
      return columnIndex >= 0 ? stripWrappedQuotes(rawValues[columnIndex]) : '';
    };

    const name = getValue('name');
    const slug = toSlug(getValue('slug') || name);
    const categoryLabel = getValue('category');
    const categoryId = categoryLookup.get(categoryLabel.toLowerCase());
    const basePriceCents = parseCurrencyToCents(getValue('baseprice'));
    const description = getValue('description') || null;
    const imageUrl = getValue('imageurl') || null;
    const active = parseCsvBoolean(getValue('active'), true);

    if (!name || name.length < 2) {
      errors.push(`Row ${rowIndex + 1}: product name is required.`);
      continue;
    }

    if (!slug) {
      errors.push(`Row ${rowIndex + 1}: slug is invalid.`);
      continue;
    }

    if (!categoryId) {
      errors.push(
        `Row ${rowIndex + 1}: category "${categoryLabel}" does not match an existing category.`
      );
      continue;
    }

    if (basePriceCents === null) {
      errors.push(`Row ${rowIndex + 1}: basePrice must be a valid number.`);
      continue;
    }

    const existingProductId = existingProductsBySlug.get(slug.toLowerCase());

    if (existingProductId) {
      previewLines.push(`Update ${slug} in ${categoryLabel} at $${(basePriceCents / 100).toFixed(2)}.`);
      rowsToUpdate.push({
        id: existingProductId,
        categoryId,
        name,
        slug,
        description,
        imageUrl,
        basePriceCents,
        active
      });
      continue;
    }

    previewLines.push(`Create ${slug} in ${categoryLabel} at $${(basePriceCents / 100).toFixed(2)}.`);
    rowsToCreate.push({
      categoryId,
      name,
      slug,
      description,
      imageUrl,
      basePriceCents,
      active
    });
  }

  if (mode === 'preview') {
    const reviewLines = [
      ...previewLines.slice(0, 8),
      ...errors.slice(0, 8)
    ];

    redirectWithReview({
      kind: 'csv',
      mode: 'preview',
      title: 'CSV Import Preview',
      summary: `Ready to create ${rowsToCreate.length} and update ${rowsToUpdate.length} products.${errors.length ? ` ${errors.length} row issue${errors.length === 1 ? '' : 's'} found.` : ''}`,
      lines: reviewLines.length > 0 ? reviewLines : ['No product rows were detected in the file.']
    });
  }

  if (errors.length > 0) {
    redirectWithMessage(errors.slice(0, 4).join(' '), 'error');
  }

  for (const product of rowsToCreate) {
    await db.insert(storeItems).values(product);
  }

  for (const product of rowsToUpdate) {
    await db
      .update(storeItems)
      .set({
        categoryId: product.categoryId,
        name: product.name,
        slug: product.slug,
        description: product.description,
        imageUrl: product.imageUrl,
        basePriceCents: product.basePriceCents,
        active: product.active,
        updatedAt: new Date()
      })
      .where(eq(storeItems.id, product.id));
  }

  const totalImported = rowsToCreate.length + rowsToUpdate.length;
  await recordStoreActivity(
    user.id,
    `STORE_IMPORT_PRODUCTS Imported ${totalImported} products (${rowsToCreate.length} created, ${rowsToUpdate.length} updated).`
  );
  revalidateStorefrontViews();
  redirectWithMessage(
    `Imported ${totalImported} product${totalImported === 1 ? '' : 's'} (${rowsToCreate.length} created, ${rowsToUpdate.length} updated).`,
    'success'
  );
}

export async function bulkMatchStoreProductImages(formData: FormData) {
  const user = await requireOwner();
  const mode = String(formData.get('mode') || 'import');

  const imageFiles = formData
    .getAll('imageFiles')
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (imageFiles.length === 0) {
    redirectWithMessage('Choose one or more image files to upload.', 'error');
  }

  const products = await db.query.storeItems.findMany({
    columns: {
      id: true,
      slug: true
    }
  });

  const productsBySlug = new Map(
    products.map((product) => [product.slug.toLowerCase(), product.id])
  );

  let matchedCount = 0;
  const unmatchedFiles: string[] = [];
  const matchedFiles: string[] = [];

  for (const file of imageFiles) {
    const baseName = file.name.replace(/\.[^.]+$/, '');
    const slug = toSlug(baseName);

    if (!slug) {
      unmatchedFiles.push(file.name);
      continue;
    }

    const productId = productsBySlug.get(slug.toLowerCase());

    if (!productId) {
      unmatchedFiles.push(file.name);
      continue;
    }

    if (mode === 'preview') {
      matchedFiles.push(`${file.name} -> ${slug}`);
      matchedCount += 1;
      continue;
    }

    const imageUrl = await saveStoreImage(file, slug);

    await db
      .update(storeItems)
      .set({
        imageUrl,
        updatedAt: new Date()
      })
      .where(eq(storeItems.id, productId));

    matchedCount += 1;
    matchedFiles.push(`${file.name} -> ${slug}`);
  }

  if (mode === 'preview') {
    redirectWithReview({
      kind: 'images',
      mode: 'preview',
      title: 'Image Match Preview',
      summary: `Matched ${matchedCount} image${matchedCount === 1 ? '' : 's'} by filename.${unmatchedFiles.length ? ` ${unmatchedFiles.length} file${unmatchedFiles.length === 1 ? '' : 's'} did not match a product slug.` : ''}`,
      lines: [
        ...matchedFiles.slice(0, 8),
        ...unmatchedFiles.slice(0, 8).map((fileName) => `Unmatched ${fileName}`)
      ]
    });
  }

  if (matchedCount === 0) {
    redirectWithMessage(
      `No filenames matched existing product slugs.${unmatchedFiles.length ? ` Unmatched: ${unmatchedFiles.slice(0, 5).join(', ')}.` : ''}`,
      'error'
    );
  }

  await recordStoreActivity(
    user.id,
    `STORE_MATCH_IMAGES Matched ${matchedCount} product images by filename.`
  );
  revalidateStorefrontViews();

  const unmatchedMessage = unmatchedFiles.length
    ? ` Unmatched: ${unmatchedFiles.slice(0, 5).join(', ')}${unmatchedFiles.length > 5 ? '...' : ''}`
    : '';

  redirectWithMessage(
    `Matched ${matchedCount} image${matchedCount === 1 ? '' : 's'} by filename.${unmatchedMessage}`,
    'success'
  );
}

export async function updateStoreProduct(formData: FormData) {
  await requireOwner();

  const productId = Number(formData.get('productId'));
  const name = String(formData.get('name') || '').trim();
  const slugInput = String(formData.get('slug') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const imageUrlInput = String(formData.get('imageUrl') || '').trim();
  const categoryId = Number(formData.get('categoryId'));
  const basePriceCents = parseCurrencyToCents(String(formData.get('basePrice') || ''));

  if (!Number.isInteger(productId) || productId <= 0) {
    redirectWithMessage('That product could not be found.', 'error');
  }

  if (name.length < 2) {
    redirectWithMessage('Product name must be at least 2 characters.', 'error');
  }

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    redirectWithMessage('Choose a category for the product.', 'error');
  }

  if (basePriceCents === null) {
    redirectWithMessage('Enter a valid base price.', 'error');
  }

  const slug = toSlug(slugInput || name);

  const [conflictingProduct] = await db
    .select({ id: storeItems.id })
    .from(storeItems)
    .where(eq(storeItems.slug, slug))
    .limit(1);

  if (conflictingProduct && conflictingProduct.id !== productId) {
    redirectWithMessage('That product slug is already in use.', 'error');
  }

  const uploadedImage = getImageFile(formData, 'imageFile');
  const imageUrl = uploadedImage
    ? await saveStoreImage(uploadedImage, slug)
    : imageUrlInput || null;

  await db
    .update(storeItems)
    .set({
      categoryId,
      name,
      slug,
      description: description || null,
      imageUrl: imageUrl || null,
      basePriceCents,
      active: getCheckedValue(formData, 'active'),
      updatedAt: new Date()
    })
    .where(eq(storeItems.id, productId));

  revalidateStorefrontViews();
  redirectWithMessage(`Updated ${name}.`, 'success');
}

export async function assignProductToStation(formData: FormData) {
  const user = await requireOwner();

  const stationId = Number(formData.get('stationId'));
  const storeItemId = Number(formData.get('storeItemId'));
  const applyToAllStations = getCheckedValue(formData, 'applyToAllStations');
  const priceCents = parseCurrencyToCents(String(formData.get('price') || ''));
  const inventoryValue = String(formData.get('inventoryCount') || '').trim();
  const inventoryCount =
    inventoryValue.length > 0 ? Number(inventoryValue) : null;

  if (!applyToAllStations && (!Number.isInteger(stationId) || stationId <= 0)) {
    redirectWithMessage('Choose a station.', 'error');
  }

  if (!Number.isInteger(storeItemId) || storeItemId <= 0) {
    redirectWithMessage('Choose a product.', 'error');
  }

  if (priceCents === null) {
    redirectWithMessage('Enter a valid station price.', 'error');
  }

  if (
    inventoryCount !== null &&
    (!Number.isInteger(inventoryCount) || inventoryCount < 0)
  ) {
    redirectWithMessage('Inventory must be zero or higher.', 'error');
  }

  const active = getCheckedValue(formData, 'active');

  const targetStations = applyToAllStations
    ? await db.query.stations.findMany({
        columns: {
          id: true
        }
      })
    : [{ id: stationId }];

  let createdCount = 0;
  let updatedCount = 0;

  for (const targetStation of targetStations) {
    const [existingAssignment] = await db
      .select({ id: stationStoreItems.id })
      .from(stationStoreItems)
      .where(
        and(
          eq(stationStoreItems.stationId, targetStation.id),
          eq(stationStoreItems.storeItemId, storeItemId)
        )
      )
      .limit(1);

    if (existingAssignment) {
      await db
        .update(stationStoreItems)
        .set({
          priceCents,
          inventoryCount,
          active,
          updatedAt: new Date()
        })
        .where(eq(stationStoreItems.id, existingAssignment.id));
      updatedCount += 1;
      continue;
    }

    await db.insert(stationStoreItems).values({
      stationId: targetStation.id,
      storeItemId,
      priceCents,
      inventoryCount,
      active
    });
    createdCount += 1;
  }

  if (applyToAllStations) {
    await recordStoreActivity(
      user.id,
      `STORE_BULK_ASSIGN_PRODUCT Applied one product across ${targetStations.length} stations (${createdCount} created, ${updatedCount} updated).`
    );
  }

  revalidateStorefrontViews();

  if (applyToAllStations) {
    redirectWithMessage(
      `Applied product to ${targetStations.length} stations (${createdCount} created, ${updatedCount} updated).`,
      'success'
    );
  }

  redirectWithMessage(
    updatedCount > 0 ? 'Updated the station assignment.' : 'Assigned product to station.',
    'success'
  );
}

export async function importStationAssignmentsCsv(formData: FormData) {
  const user = await requireOwner();
  const mode = String(formData.get('mode') || 'import');

  const csvFile = formData.get('csvFile');

  if (!(csvFile instanceof File) || csvFile.size === 0) {
    redirectWithMessage('Choose a station assignment CSV file to import.', 'error');
  }

  if (!csvFile.name.toLowerCase().endsWith('.csv')) {
    redirectWithMessage('Station assignment import only accepts CSV files.', 'error');
  }

  const csvText = String(await csvFile.text()).replace(/^\uFEFF/, '');
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    redirectWithMessage(
      'Station assignment CSV needs a header row and at least one assignment row.',
      'error'
    );
  }

  const headerColumns = parseCsvRow(lines[0]).map(normalizeCsvHeader);
  const requiredHeaders = ['station', 'productslug', 'price'];
  const missingHeaders = requiredHeaders.filter((header) => !headerColumns.includes(header));

  if (missingHeaders.length > 0) {
    redirectWithMessage(
      `Station assignment CSV is missing required columns: ${missingHeaders.join(', ')}.`,
      'error'
    );
  }

  const [stations, products] = await Promise.all([
    db.query.stations.findMany({
      columns: {
        id: true,
        name: true
      }
    }),
    db.query.storeItems.findMany({
      columns: {
        id: true,
        slug: true
      }
    })
  ]);

  const stationLookup = new Map(stations.map((station) => [station.name.toLowerCase(), station.id]));
  const productLookup = new Map(products.map((product) => [product.slug.toLowerCase(), product.id]));

  const previewLines: string[] = [];
  const errors: string[] = [];
  const rowsToImport: Array<{
    stationId: number;
    storeItemId: number;
    stationName: string;
    productSlug: string;
    priceCents: number;
    inventoryCount: number | null;
    active: boolean;
  }> = [];

  for (let rowIndex = 1; rowIndex < lines.length; rowIndex += 1) {
    const rawValues = parseCsvRow(lines[rowIndex]);
    const getValue = (header: string) => {
      const columnIndex = headerColumns.indexOf(header);
      return columnIndex >= 0 ? stripWrappedQuotes(rawValues[columnIndex]) : '';
    };

    const stationName = getValue('station');
    const productSlug = toSlug(getValue('productslug'));
    const priceCents = parseCurrencyToCents(getValue('price'));
    const inventoryValue = getValue('inventory');
    const inventoryCount = inventoryValue ? Number(inventoryValue) : null;
    const active = parseCsvBoolean(getValue('active'), true);
    const stationId = stationLookup.get(stationName.toLowerCase());
    const storeItemId = productLookup.get(productSlug.toLowerCase());

    if (!stationId) {
      errors.push(`Row ${rowIndex + 1}: station "${stationName}" was not found.`);
      continue;
    }

    if (!storeItemId) {
      errors.push(`Row ${rowIndex + 1}: product slug "${productSlug}" was not found.`);
      continue;
    }

    if (priceCents === null) {
      errors.push(`Row ${rowIndex + 1}: price must be a valid number.`);
      continue;
    }

    if (
      inventoryCount !== null &&
      (!Number.isInteger(inventoryCount) || inventoryCount < 0)
    ) {
      errors.push(`Row ${rowIndex + 1}: inventory must be zero or higher.`);
      continue;
    }

    previewLines.push(
      `${stationName} -> ${productSlug} at $${(priceCents / 100).toFixed(2)}${inventoryCount !== null ? `, inventory ${inventoryCount}` : ''}, ${active ? 'active' : 'inactive'}.`
    );

    rowsToImport.push({
      stationId,
      storeItemId,
      stationName,
      productSlug,
      priceCents,
      inventoryCount,
      active
    });
  }

  if (mode === 'preview') {
    redirectWithReview({
      kind: 'station-csv',
      mode: 'preview',
      title: 'Station Assignment Import Preview',
      summary: `Ready to import ${rowsToImport.length} station assignment row${rowsToImport.length === 1 ? '' : 's'}.${errors.length ? ` ${errors.length} row issue${errors.length === 1 ? '' : 's'} found.` : ''}`,
      lines: [...previewLines.slice(0, 8), ...errors.slice(0, 8)]
    });
  }

  if (errors.length > 0) {
    redirectWithMessage(errors.slice(0, 4).join(' '), 'error');
  }

  let createdCount = 0;
  let updatedCount = 0;

  for (const row of rowsToImport) {
    const [existingAssignment] = await db
      .select({ id: stationStoreItems.id })
      .from(stationStoreItems)
      .where(
        and(
          eq(stationStoreItems.stationId, row.stationId),
          eq(stationStoreItems.storeItemId, row.storeItemId)
        )
      )
      .limit(1);

    if (existingAssignment) {
      await db
        .update(stationStoreItems)
        .set({
          priceCents: row.priceCents,
          inventoryCount: row.inventoryCount,
          active: row.active,
          updatedAt: new Date()
        })
        .where(eq(stationStoreItems.id, existingAssignment.id));
      updatedCount += 1;
      continue;
    }

    await db.insert(stationStoreItems).values({
      stationId: row.stationId,
      storeItemId: row.storeItemId,
      priceCents: row.priceCents,
      inventoryCount: row.inventoryCount,
      active: row.active
    });
    createdCount += 1;
  }

  await recordStoreActivity(
    user.id,
    `STORE_IMPORT_STATION_ASSIGNMENTS Imported ${rowsToImport.length} station assignment rows (${createdCount} created, ${updatedCount} updated).`
  );
  revalidateStorefrontViews();
  redirectWithMessage(
    `Imported ${rowsToImport.length} station assignment row${rowsToImport.length === 1 ? '' : 's'} (${createdCount} created, ${updatedCount} updated).`,
    'success'
  );
}

export async function updateStationCatalogItem(formData: FormData) {
  await requireOwner();

  const stationStoreItemId = Number(formData.get('stationStoreItemId'));
  const priceCents = parseCurrencyToCents(String(formData.get('price') || ''));
  const inventoryValue = String(formData.get('inventoryCount') || '').trim();
  const inventoryCount =
    inventoryValue.length > 0 ? Number(inventoryValue) : null;

  if (!Number.isInteger(stationStoreItemId) || stationStoreItemId <= 0) {
    redirectWithMessage('That station product could not be found.', 'error');
  }

  if (priceCents === null) {
    redirectWithMessage('Enter a valid station price.', 'error');
  }

  if (
    inventoryCount !== null &&
    (!Number.isInteger(inventoryCount) || inventoryCount < 0)
  ) {
    redirectWithMessage('Inventory must be zero or higher.', 'error');
  }

  await db
    .update(stationStoreItems)
    .set({
      priceCents,
      inventoryCount,
      active: getCheckedValue(formData, 'active'),
      updatedAt: new Date()
    })
    .where(eq(stationStoreItems.id, stationStoreItemId));

  revalidateStorefrontViews();
  redirectWithMessage('Updated station catalog item.', 'success');
}

export async function toggleStoreCategory(formData: FormData) {
  await requireOwner();

  const categoryId = Number(formData.get('categoryId'));
  const active = String(formData.get('active')) === 'true';

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    redirectWithMessage('That category could not be found.', 'error');
  }

  await db
    .update(storeCategories)
    .set({
      active,
      updatedAt: new Date()
    })
    .where(eq(storeCategories.id, categoryId));

  revalidateStorefrontViews();
  redirectWithMessage('Category updated.', 'success');
}

export async function bulkUpdateStoreProductsStatus({
  productIds,
  active
}: {
  productIds: number[];
  active: boolean;
}) {
  const user = await requireOwner();

  const validProductIds = Array.from(
    new Set(productIds.filter((productId) => Number.isInteger(productId) && productId > 0))
  );

  if (validProductIds.length === 0) {
    return {
      error: 'Select at least one product first.'
    };
  }

  await db
    .update(storeItems)
    .set({
      active,
      updatedAt: new Date()
    })
    .where(inArray(storeItems.id, validProductIds));

  await recordStoreActivity(
    user.id,
    `STORE_BULK_UPDATE_PRODUCTS Updated ${validProductIds.length} products to ${active ? 'active' : 'inactive'}.`
  );
  revalidateStorefrontViews();

  return {
    success: `Updated ${validProductIds.length} product${
      validProductIds.length === 1 ? '' : 's'
    }.`
  };
}

export async function bulkUpdateStationCatalogStatus(formData: FormData) {
  const user = await requireOwner();

  const stationId = Number(formData.get('stationId'));
  const active = String(formData.get('active')) === 'true';

  if (!Number.isInteger(stationId) || stationId <= 0) {
    redirectWithMessage('Choose a valid station first.', 'error');
  }

  await db
    .update(stationStoreItems)
    .set({
      active,
      updatedAt: new Date()
    })
    .where(eq(stationStoreItems.stationId, stationId));

  await recordStoreActivity(
    user.id,
    `STORE_BULK_UPDATE_STATION Updated all products for station ${stationId} to ${active ? 'active' : 'inactive'}.`
  );
  revalidateStorefrontViews();
  redirectWithMessage(
    `Marked all products for this station as ${active ? 'active' : 'inactive'}.`,
    'success'
  );
}
