'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import {
  stationStoreItems,
  stations,
  storeCategories,
  storeItems
} from '@/lib/db/schema';

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

async function requireOwner() {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (user.role !== 'owner') {
    redirect('/dashboard/store?error=Only owners can manage the store catalog.');
  }

  return user;
}

function redirectWithMessage(
  message: string,
  type: 'success' | 'error'
): never {
  redirect(`/dashboard/store?${type}=${encodeURIComponent(message)}`);
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

  revalidatePath('/dashboard/store');
  revalidatePath('/market');
  revalidatePath('/book');
  redirectWithMessage(`Created ${name}.`, 'success');
}

export async function createStoreProduct(formData: FormData) {
  await requireOwner();

  const name = String(formData.get('name') || '').trim();
  const slugInput = String(formData.get('slug') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const imageUrl = String(formData.get('imageUrl') || '').trim();
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

  await db.insert(storeItems).values({
    categoryId,
    name,
    slug,
    description: description || null,
    imageUrl: imageUrl || null,
    basePriceCents,
    active: getCheckedValue(formData, 'active')
  });

  revalidatePath('/dashboard/store');
  revalidatePath('/market');
  revalidatePath('/book');
  redirectWithMessage(`Created ${name}.`, 'success');
}

export async function updateStoreProduct(formData: FormData) {
  await requireOwner();

  const productId = Number(formData.get('productId'));
  const name = String(formData.get('name') || '').trim();
  const slugInput = String(formData.get('slug') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const imageUrl = String(formData.get('imageUrl') || '').trim();
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

  revalidatePath('/dashboard/store');
  revalidatePath('/market');
  revalidatePath('/book');
  redirectWithMessage(`Updated ${name}.`, 'success');
}

export async function assignProductToStation(formData: FormData) {
  await requireOwner();

  const stationId = Number(formData.get('stationId'));
  const storeItemId = Number(formData.get('storeItemId'));
  const priceCents = parseCurrencyToCents(String(formData.get('price') || ''));
  const inventoryValue = String(formData.get('inventoryCount') || '').trim();
  const inventoryCount =
    inventoryValue.length > 0 ? Number(inventoryValue) : null;

  if (!Number.isInteger(stationId) || stationId <= 0) {
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

  const [existingAssignment] = await db
    .select({ id: stationStoreItems.id })
    .from(stationStoreItems)
    .where(
      and(
        eq(stationStoreItems.stationId, stationId),
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
        active: getCheckedValue(formData, 'active'),
        updatedAt: new Date()
      })
      .where(eq(stationStoreItems.id, existingAssignment.id));

    revalidatePath('/dashboard/store');
    revalidatePath('/market');
    revalidatePath('/book');
    redirectWithMessage('Updated the station assignment.', 'success');
  }

  await db.insert(stationStoreItems).values({
    stationId,
    storeItemId,
    priceCents,
    inventoryCount,
    active: getCheckedValue(formData, 'active')
  });

  revalidatePath('/dashboard/store');
  revalidatePath('/market');
  revalidatePath('/book');
  redirectWithMessage('Assigned product to station.', 'success');
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

  revalidatePath('/dashboard/store');
  revalidatePath('/market');
  revalidatePath('/book');
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

  revalidatePath('/dashboard/store');
  revalidatePath('/market');
  revalidatePath('/book');
  redirectWithMessage('Category updated.', 'success');
}
