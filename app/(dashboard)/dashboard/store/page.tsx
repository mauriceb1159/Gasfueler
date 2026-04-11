import Image from 'next/image';
import { redirect } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/db/drizzle';
import { getUser } from '@/lib/db/queries';
import {
  assignProductToStation,
  createStoreCategory,
  createStoreProduct,
  toggleStoreCategory,
  updateStationCatalogItem,
  updateStoreProduct
} from './actions';

export default async function StoreBackOfficePage({
  searchParams
}: {
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  const params = (await searchParams) ?? {};

  const [categories, stations, products] = await Promise.all([
    db.query.storeCategories.findMany({
      with: {
        storeItems: {
          orderBy: (storeItems, { asc }) => [asc(storeItems.name)]
        }
      },
      orderBy: (storeCategories, { asc }) => [
        asc(storeCategories.sortOrder),
        asc(storeCategories.name)
      ]
    }),
    db.query.stations.findMany({
      with: {
        stationStoreItems: {
          with: {
            storeItem: {
              with: {
                category: true
              }
            }
          },
          orderBy: (stationStoreItems, { asc }) => [asc(stationStoreItems.id)]
        }
      },
      orderBy: (stations, { asc }) => [asc(stations.name)]
    }),
    db.query.storeItems.findMany({
      with: {
        category: true
      },
      orderBy: (storeItems, { asc }) => [asc(storeItems.name)]
    })
  ]);

  const totalAssignments = stations.reduce(
    (sum, station) => sum + station.stationStoreItems.length,
    0
  );

  const productAssignments = new Map<
    number,
    { stationName: string; priceCents: number; active: boolean }[]
  >();

  for (const station of stations) {
    for (const stationItem of station.stationStoreItems) {
      const assignments = productAssignments.get(stationItem.storeItemId) ?? [];
      assignments.push({
        stationName: station.name,
        priceCents: stationItem.priceCents,
        active: stationItem.active
      });
      productAssignments.set(stationItem.storeItemId, assignments);
    }
  }

  const isOwner = user.role === 'owner';

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

      {!isOwner ? (
        <Card className="mt-8 border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground">
            You must be a team owner to manage the back-office store catalog.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <MetricCard label="Categories" value={String(categories.length)} />
            <MetricCard label="Products" value={String(products.length)} />
            <MetricCard label="Station Assignments" value={String(totalAssignments)} />
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-3">
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

            <Card className="xl:col-span-2">
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
                      {categories.map((category) => (
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

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Assign Product To Station</CardTitle>
            </CardHeader>
            <CardContent>
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
                    {products.map((product) => (
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
                  <Button type="submit" className="bg-slate-900 text-white hover:bg-slate-800">
                    Save Station Assignment
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <section className="mt-8 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-950 lg:text-xl">Categories</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Quick visibility into what is active and how many products sit in each bucket.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {categories.map((category) => (
                <Card key={category.id}>
                  <CardContent className="flex items-center justify-between gap-4 p-5">
                    <div>
                      <p className="font-semibold text-slate-950">{category.name}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {category.slug} • {category.storeItems.length} item
                        {category.storeItems.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <form action={toggleStoreCategory}>
                      <input type="hidden" name="categoryId" value={category.id} />
                      <input type="hidden" name="active" value={String(!category.active)} />
                      <Button type="submit" variant="outline" className="rounded-full">
                        {category.active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="mt-8 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-950 lg:text-xl">Products</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Edit the customer-facing name, image path, description, base price, and category.
              </p>
            </div>
            <div className="space-y-4">
              {products.map((product) => (
                <Card key={product.id}>
                  <CardContent className="p-5">
                    <div className="mb-4 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-center gap-4">
                        <ProductPreview
                          imageUrl={product.imageUrl}
                          name={product.name}
                        />
                        <div>
                          <p className="font-semibold text-slate-950">{product.name}</p>
                          <p className="mt-1 text-sm text-slate-500">{product.slug}</p>
                          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-400">
                            Product data
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1 text-sm text-slate-600">
                        <p>
                          Base price:{' '}
                          <span className="font-medium text-slate-950">
                            ${(product.basePriceCents / 100).toFixed(2)}
                          </span>
                        </p>
                        <p>
                          Image path:{' '}
                          <span className="font-mono text-xs text-slate-950">
                            {product.imageUrl || '(none)'}
                          </span>
                        </p>
                        <p>
                          Used by{' '}
                          <span className="font-medium text-slate-950">
                            {productAssignments.get(product.id)?.length ?? 0}
                          </span>{' '}
                          station
                          {(productAssignments.get(product.id)?.length ?? 0) === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                    <form action={updateStoreProduct} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <input type="hidden" name="productId" value={product.id} />
                      <Field id={`product-name-${product.id}`} label="Name" name="name" placeholder="Name" defaultValue={product.name} />
                      <Field id={`product-slug-${product.id}`} label="Slug" name="slug" placeholder="Slug" defaultValue={product.slug} />
                      <div>
                        <Label htmlFor={`product-category-${product.id}`} className="mb-2">
                          Category
                        </Label>
                        <select
                          id={`product-category-${product.id}`}
                          name="categoryId"
                          defaultValue={String(product.categoryId)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Field
                        id={`product-image-${product.id}`}
                        label="Image URL"
                        name="imageUrl"
                        placeholder="/store-items/item.svg"
                        defaultValue={product.imageUrl ?? ''}
                      />
                      <Field
                        id={`product-price-${product.id}`}
                        label="Base Price"
                        name="basePrice"
                        placeholder="0.00"
                        defaultValue={(product.basePriceCents / 100).toFixed(2)}
                      />
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input type="checkbox" name="active" defaultChecked={product.active} />
                          Active
                        </label>
                      </div>
                      <div className="md:col-span-2 xl:col-span-3">
                        <Field
                          id={`product-description-${product.id}`}
                          label="Description"
                          name="description"
                          placeholder="Short product description"
                          defaultValue={product.description ?? ''}
                        />
                      </div>
                      <div className="md:col-span-2 xl:col-span-3 flex items-center justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                            {product.category?.name ?? 'Uncategorized'}
                          </p>
                          <p className="text-xs text-slate-500">
                            Station usage:{' '}
                            {productAssignments.get(product.id)?.length
                              ? productAssignments
                                  .get(product.id)!
                                  .map((assignment) => assignment.stationName)
                                  .join(', ')
                              : 'Not assigned to any station yet'}
                          </p>
                        </div>
                        <Button type="submit" variant="outline">
                          Save Product
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="mt-8 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-950 lg:text-xl">Station Catalog</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Set station-specific prices, inventory, and active state for each partner location.
              </p>
            </div>

            <div className="space-y-6">
              {stations.map((station) => (
                <Card key={station.id}>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {station.name} • {station.city}, {station.state}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {station.stationStoreItems.length > 0 ? (
                      station.stationStoreItems.map((item) => (
                        <form
                          key={item.id}
                          action={updateStationCatalogItem}
                          className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:grid-cols-2 xl:grid-cols-5"
                        >
                          <input type="hidden" name="stationStoreItemId" value={item.id} />
                          <div className="xl:col-span-2">
                            <div className="flex items-center gap-3">
                              <ProductPreview
                                imageUrl={item.storeItem.imageUrl}
                                name={item.storeItem.name}
                                size="sm"
                              />
                              <div>
                                <p className="font-semibold text-slate-950">
                                  {item.storeItem.name}
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                  {item.storeItem.category?.name ?? 'Uncategorized'}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  Product base price: $
                                  {(item.storeItem.basePriceCents / 100).toFixed(2)} • Image:{' '}
                                  {item.storeItem.imageUrl || '(none)'}
                                </p>
                              </div>
                            </div>
                          </div>
                          <Field
                            id={`station-price-${item.id}`}
                            label="Price"
                            name="price"
                            placeholder="0.00"
                            defaultValue={(item.priceCents / 100).toFixed(2)}
                          />
                          <Field
                            id={`station-inventory-${item.id}`}
                            label="Inventory"
                            name="inventoryCount"
                            placeholder="24"
                            defaultValue={item.inventoryCount?.toString() ?? ''}
                          />
                          <div className="flex items-end justify-between gap-3 xl:justify-end">
                            <label className="flex items-center gap-2 text-sm text-slate-700">
                              <input type="checkbox" name="active" defaultChecked={item.active} />
                              Active
                            </label>
                            <Button type="submit" variant="outline">
                              Save
                            </Button>
                          </div>
                        </form>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-5 text-sm text-slate-500">
                        No products assigned to this station yet.
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </>
      )}
    </section>
  );
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

function ProductPreview({
  imageUrl,
  name,
  size = 'lg'
}: {
  imageUrl: string | null;
  name: string;
  size?: 'sm' | 'lg';
}) {
  const dimensions =
    size === 'sm'
      ? 'relative h-12 w-12 overflow-hidden rounded-2xl border border-slate-200 bg-white'
      : 'relative h-20 w-20 overflow-hidden rounded-3xl border border-slate-200 bg-white';

  if (imageUrl) {
    return (
      <div className={dimensions}>
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-contain p-2"
          sizes={size === 'sm' ? '48px' : '80px'}
        />
      </div>
    );
  }

  return (
    <div
      className={`${dimensions} flex items-center justify-center bg-slate-100 text-sm font-semibold uppercase text-slate-500`}
    >
      {name.charAt(0)}
    </div>
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
