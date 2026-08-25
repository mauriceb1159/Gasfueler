import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { asc, desc, eq } from 'drizzle-orm';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { canManageStoreCatalog } from '@/lib/auth/roles';
import { db } from '@/lib/db/drizzle';
import { getUser } from '@/lib/db/queries';
import { activityLogs, teamMembers } from '@/lib/db/schema';
import {
  assignProductToStation,
  bulkMatchStoreProductImages,
  createStoreCategory,
  createStoreProduct,
  importStationAssignmentsCsv,
  importStoreProductsCsv
} from './actions';
import { StoreCategoriesSection } from './store-categories-section';
import { StoreProductsSection } from './store-products-section';
import { StoreStationCatalogSection } from './store-station-catalog-section';

export default async function StoreBackOfficePage({
  searchParams
}: {
  searchParams?: Promise<{ success?: string; error?: string; review?: string }>;
}) {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  const params = (await searchParams) ?? {};
  const review = decodeStoreReview(params.review);
  const membership = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, user.id),
    columns: {
      teamId: true
    }
  });

  const [categoryOptions, stations, productOptions, productsForSearch, recentStoreActivity] =
    await Promise.all([
      db.query.storeCategories.findMany({
        columns: {
          id: true,
          name: true,
          slug: true,
          sortOrder: true
        },
        orderBy: (storeCategories, { asc }) => [
          asc(storeCategories.sortOrder),
          asc(storeCategories.name)
        ]
      }),
      db.query.stations.findMany({
        columns: {
          id: true,
          name: true
        },
        with: {
          stationStoreItems: {
            columns: {
              id: true,
              storeItemId: true
            }
          }
        },
        orderBy: (stations, { asc }) => [asc(stations.name)]
      }),
      db.query.storeItems.findMany({
        columns: {
          id: true,
          name: true
        },
        orderBy: (storeItems, { asc }) => [asc(storeItems.name)]
      }),
      db.query.storeItems.findMany({
        columns: {
          id: true,
          categoryId: true,
          name: true,
          slug: true,
          description: true,
          imageUrl: true,
          basePriceCents: true,
          active: true
        },
        with: {
          category: {
            columns: {
              id: true,
              name: true
            }
          }
        },
        orderBy: (storeItems, { asc }) => [asc(storeItems.name)]
      }),
      membership
        ? db.query.activityLogs.findMany({
            where: eq(activityLogs.teamId, membership.teamId),
            columns: {
              id: true,
              action: true,
              timestamp: true
            },
            with: {
              user: {
                columns: {
                  name: true,
                  email: true
                }
              }
            },
            orderBy: (activityLogs, { desc }) => [desc(activityLogs.timestamp)],
            limit: 10
          })
        : Promise.resolve([])
    ]);

  const totalAssignments = stations.reduce(
    (sum, station) => sum + station.stationStoreItems.length,
    0
  );

  const productAssignments = Object.fromEntries(
    productsForSearch.map((product) => [
      product.id,
      stations
        .filter((station) =>
          station.stationStoreItems.some((item) => item.storeItemId === product.id)
        )
        .map((station) => station.name)
    ])
  ) as Record<number, string[]>;

  const canManageCatalog = canManageStoreCatalog(user.role);

  return (
    <section className="flex-1 p-4 lg:p-8">
      <div className="max-w-5xl">
        <h1 className="text-lg font-medium text-gray-900 lg:text-2xl">
          Store Back Office
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Manage categories, products, prices, images, and station-specific catalog
          assignments without exposing any of it to customers.
        </p>
      </div>

      {params.error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {params.error}
        </div>
      ) : null}

      {params.success ? (
        <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {params.success}
        </div>
      ) : null}

      {review ? (
        <Card className="mt-6 border-slate-200 bg-slate-50/70">
          <CardHeader>
            <CardTitle>{review.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-700">{review.summary}</p>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <ul className="space-y-2 text-sm text-slate-600">
                {review.lines.map((line, index) => (
                  <li key={`${review.kind}-${index}`}>{line}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!canManageCatalog ? (
        <Card className="mt-8 border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground">
            You must be a store admin to manage the back-office store catalog.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <MetricCard label="Categories" value={String(categoryOptions.length)} />
            <MetricCard label="Products" value={String(productOptions.length)} />
            <MetricCard label="Station Assignments" value={String(totalAssignments)} />
          </div>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Recent Store Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {recentStoreActivity.length > 0 ? (
                <div className="space-y-3">
                  {recentStoreActivity.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">
                          {formatStoreActivity(entry.action)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {entry.user?.name || entry.user?.email || 'Unknown user'}
                        </p>
                      </div>
                      <p className="shrink-0 text-xs text-slate-500">
                        {formatStoreActivityTime(entry.timestamp)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-5 text-sm text-slate-500">
                  Bulk imports, exports, and station-wide changes will show up here.
                </div>
              )}
            </CardContent>
          </Card>

          <SectionBlock
            title="Catalog Setup"
            description="Create categories and add new products without keeping the full editor open all the time."
            defaultOpen={false}
            className="mt-8"
          >
            <div className="grid gap-6 xl:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Create Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <form action={createStoreCategory} className="space-y-4">
                    <Field id="category-name" label="Name" name="name" placeholder="Snacks" />
                    <Field id="category-slug" label="Slug" name="slug" placeholder="snacks" />
                    <Field
                      id="category-sort-order"
                      label="Sort Order"
                      name="sortOrder"
                      placeholder="1"
                    />
                    <Button type="submit" className="w-full bg-slate-900 text-white hover:bg-slate-800">
                      Create Category
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Bulk Import CSV</CardTitle>
                </CardHeader>
                <CardContent>
                  <form action={importStoreProductsCsv} className="space-y-4">
                    <div>
                      <Label htmlFor="products-csv-file" className="mb-2">
                        Product CSV
                      </Label>
                      <Input
                        id="products-csv-file"
                        name="csvFile"
                        type="file"
                        accept=".csv,text/csv"
                      />
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-xs text-slate-600">
                      Required columns: <span className="font-mono">name, slug, category, basePrice</span>
                      <br />
                      Optional columns: <span className="font-mono">description, imageUrl, active</span>
                      <br />
                      Category can match either the existing category name or slug.
                    </div>
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
                      Example:
                      <br />
                      <span className="font-mono">
                        name,slug,category,basePrice,description,imageUrl,active
                      </span>
                      <br />
                      <span className="font-mono">
                        Smart Water,smart-water,Drinks,2.99,Purified water,,true
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs">
                      <Link
                        href="/store-items/product-import-template.csv"
                        className="rounded-full border border-slate-200 px-3 py-1.5 text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        Download CSV Template
                      </Link>
                      <Link
                        href="/api/store-products/export"
                        className="rounded-full border border-slate-200 px-3 py-1.5 text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        Export Current Catalog
                      </Link>
                    </div>
                    <div className="flex gap-3">
                      <Button type="submit" name="mode" value="preview" variant="outline" className="flex-1">
                        Preview Import
                      </Button>
                      <Button type="submit" name="mode" value="import" className="flex-1 bg-slate-900 text-white hover:bg-slate-800">
                        Import Products
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Bulk Match Images</CardTitle>
                </CardHeader>
                <CardContent>
                  <form action={bulkMatchStoreProductImages} className="space-y-4">
                    <div>
                      <Label htmlFor="products-image-files" className="mb-2">
                        Product images
                      </Label>
                      <Input
                        id="products-image-files"
                        name="imageFiles"
                        type="file"
                        accept="image/*"
                        multiple
                      />
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-xs text-slate-600">
                      Match files to existing products by filename.
                      <br />
                      Example: <span className="font-mono">smart-water.jpg</span> matches the
                      product slug <span className="font-mono">smart-water</span>.
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs">
                      <Link
                        href="/store-items/image-naming-guide.txt"
                        className="rounded-full border border-slate-200 px-3 py-1.5 text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        Download Image Naming Guide
                      </Link>
                    </div>
                    <div className="flex gap-3">
                      <Button type="submit" name="mode" value="preview" variant="outline" className="flex-1">
                        Preview Match
                      </Button>
                      <Button type="submit" name="mode" value="import" className="flex-1 bg-slate-900 text-white hover:bg-slate-800">
                        Upload And Match Images
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card className="xl:col-span-3">
                <CardHeader>
                  <CardTitle>Add Product</CardTitle>
                </CardHeader>
                <CardContent>
                  <form action={createStoreProduct} className="grid gap-4 md:grid-cols-2">
                    <Field id="product-name" label="Name" name="name" placeholder="Twix Share Size" />
                    <Field id="product-slug" label="Slug" name="slug" placeholder="twix-share-size" />
                    <div>
                      <Label htmlFor="product-category" className="mb-2">
                        Category
                      </Label>
                      <select
                        id="product-category"
                        name="categoryId"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Choose a category
                        </option>
                        {categoryOptions.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Field id="product-base-price" label="Base Price" name="basePrice" placeholder="3.49" />
                    <div className="md:col-span-2">
                      <Field
                        id="product-image"
                        label="Image URL"
                        name="imageUrl"
                        placeholder="/store-items/candy-share.svg"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="product-image-file" className="mb-2">
                        Upload image from desktop
                      </Label>
                      <Input
                        id="product-image-file"
                        name="imageFile"
                        type="file"
                        accept="image/*"
                      />
                      <p className="mt-2 text-xs text-slate-500">
                        Optional. If you choose a file here, it will be uploaded to the
                        public Supabase `store-images` bucket and used instead of the URL above.
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <Field
                        id="product-description"
                        label="Description"
                        name="description"
                        placeholder="Cookie bar share bag with caramel and chocolate."
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" name="active" defaultChecked />
                      Active for catalog
                    </label>
                    <div className="md:col-span-2">
                      <Button type="submit" className="bg-slate-900 text-white hover:bg-slate-800">
                        Create Product
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </SectionBlock>

          <SectionBlock
            title="Assign Product To Station"
            description="Link a product to one station or push the same assignment across every station at once."
            defaultOpen={false}
            className="mt-6"
          >
            <div className="grid gap-6 xl:grid-cols-3">
              <Card className="xl:col-span-2">
                <CardContent className="pt-6">
                  <form action={assignProductToStation} className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <div>
                      <Label htmlFor="assign-station" className="mb-2">
                        Station
                      </Label>
                      <select
                        id="assign-station"
                        name="stationId"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Choose a station
                        </option>
                        {stations.map((station) => (
                          <option key={station.id} value={station.id}>
                            {station.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="assign-product" className="mb-2">
                        Product
                      </Label>
                      <select
                        id="assign-product"
                        name="storeItemId"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Choose a product
                        </option>
                        {productOptions.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Field id="assign-price" label="Station Price" name="price" placeholder="3.49" />
                    <Field id="assign-inventory" label="Inventory" name="inventoryCount" placeholder="24" />
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" name="active" defaultChecked />
                        Active
                      </label>
                    </div>
                    <div className="md:col-span-2 xl:col-span-5">
                      <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
                        <input type="checkbox" name="applyToAllStations" className="mt-0.5" />
                        <span>
                          Apply this product, price, inventory, and active state to every
                          station. Leave this unchecked when you only want one location.
                        </span>
                      </label>
                    </div>
                    <div className="md:col-span-2 xl:col-span-5">
                      <Button type="submit" className="bg-slate-900 text-white hover:bg-slate-800">
                        Save Station Assignment
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Bulk Station CSV</CardTitle>
                </CardHeader>
                <CardContent>
                  <form action={importStationAssignmentsCsv} className="space-y-4">
                    <div>
                      <Label htmlFor="station-assignment-csv-file" className="mb-2">
                        Station assignment CSV
                      </Label>
                      <Input
                        id="station-assignment-csv-file"
                        name="csvFile"
                        type="file"
                        accept=".csv,text/csv"
                      />
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-xs text-slate-600">
                      Required columns: <span className="font-mono">station, productSlug, price</span>
                      <br />
                      Optional columns: <span className="font-mono">inventory, active</span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs">
                      <Link
                        href="/store-items/station-assignment-template.csv"
                        className="rounded-full border border-slate-200 px-3 py-1.5 text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        Download Station Template
                      </Link>
                      <Link
                        href="/api/store-station-assignments/export"
                        className="rounded-full border border-slate-200 px-3 py-1.5 text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        Export Station Assignments
                      </Link>
                    </div>
                    <div className="flex gap-3">
                      <Button type="submit" name="mode" value="preview" variant="outline" className="flex-1">
                        Preview Import
                      </Button>
                      <Button type="submit" name="mode" value="import" className="flex-1 bg-slate-900 text-white hover:bg-slate-800">
                        Import CSV
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </SectionBlock>

          <SectionBlock
            title="Categories"
            description="Quick visibility into what is active and how many products sit in each bucket."
            defaultOpen={false}
            className="mt-8"
          >
            <Suspense fallback={<SectionFallback rows={2} />}>
              <StoreCategoriesSection />
            </Suspense>
          </SectionBlock>

          <SectionBlock
            title="Products"
            description="Scan the catalog quickly, then open only the product you want to edit."
            defaultOpen={true}
            className="mt-8"
          >
            <StoreProductsSection
              products={productsForSearch}
              categories={categoryOptions.map((category) => ({
                id: category.id,
                name: category.name
              }))}
              productAssignments={productAssignments}
            />
          </SectionBlock>

          <SectionBlock
            title="Station Catalog"
            description="Set station-specific prices, inventory, and active state for each partner location."
            defaultOpen={false}
            className="mt-8"
          >
            <Suspense fallback={<SectionFallback rows={3} />}>
              <StoreStationCatalogSection />
            </Suspense>
          </SectionBlock>
        </>
      )}
    </section>
  );
}

function decodeStoreReview(encodedReview?: string) {
  if (!encodedReview) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(encodedReview, 'base64url').toString('utf8')) as {
      kind: 'csv' | 'images' | 'station-csv';
      mode: 'preview' | 'result';
      title: string;
      summary: string;
      lines: string[];
    };
  } catch {
    return null;
  }
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          {label}
        </p>
        <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
      </CardContent>
    </Card>
  );
}

function formatStoreActivity(action: string) {
  return action.replace(/^STORE_[A-Z_]+\s+/, '');
}

function formatStoreActivityTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function SectionFallback({ rows }: { rows: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }, (_, index) => (
        <Card key={index}>
          <CardContent className="p-5">
            <div className="animate-pulse space-y-3">
              <div className="h-5 w-40 rounded bg-slate-200" />
              <div className="h-4 w-full rounded bg-slate-100" />
              <div className="h-4 w-2/3 rounded bg-slate-100" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SectionBlock({
  title,
  description,
  children,
  className,
  defaultOpen = false
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
}) {
  return (
    <details className={className} {...(defaultOpen ? { open: true } : {})}>
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 rounded-3xl border border-slate-200 bg-white px-5 py-4 marker:hidden">
        <div>
          <h2 className="text-base font-semibold text-slate-950 lg:text-xl">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
          Toggle
        </span>
      </summary>
      <div className="pt-4">{children}</div>
    </details>
  );
}

function Field({
  id,
  label,
  name,
  placeholder,
  defaultValue
}: {
  id: string;
  label: string;
  name: string;
  placeholder: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <Label htmlFor={id} className="mb-2">
        {label}
      </Label>
      <Input id={id} name={name} placeholder={placeholder} defaultValue={defaultValue} />
    </div>
  );
}
