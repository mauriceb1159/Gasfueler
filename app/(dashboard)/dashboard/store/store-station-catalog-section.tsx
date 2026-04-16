import Image from 'next/image';
import { asc } from 'drizzle-orm';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/db/drizzle';
import {
  bulkUpdateStationCatalogStatus,
  updateStationCatalogItem
} from './actions';

export async function StoreStationCatalogSection() {
  const stations = await db.query.stations.findMany({
    columns: {
      id: true,
      name: true,
      city: true,
      state: true
    },
    with: {
      stationStoreItems: {
        columns: {
          id: true,
          priceCents: true,
          active: true,
          inventoryCount: true
        },
        with: {
          storeItem: {
            columns: {
              id: true,
              name: true,
              imageUrl: true,
              basePriceCents: true
            },
            with: {
              category: {
                columns: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        orderBy: (stationStoreItems, { asc }) => [asc(stationStoreItems.id)]
      }
    },
    orderBy: (stations, { asc }) => [asc(stations.name)]
  });

  return (
    <div className="space-y-6">
      {stations.map((station) => (
        <Card key={station.id}>
          <CardHeader>
            <CardTitle className="text-base">
              {station.name} - {station.city}, {station.state}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <details>
              <summary className="cursor-pointer list-none rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700 marker:hidden">
                <span className="font-medium text-slate-950">
                  {station.stationStoreItems.length}
                </span>{' '}
                assigned product{station.stationStoreItems.length === 1 ? '' : 's'}. Open
                station catalog editor
              </summary>
              <div className="mt-4 space-y-4">
                {station.stationStoreItems.length > 0 ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-sm text-slate-600">
                        Station-wide actions for all assigned products
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <form action={bulkUpdateStationCatalogStatus}>
                          <input type="hidden" name="stationId" value={station.id} />
                          <input type="hidden" name="active" value="true" />
                          <Button type="submit" variant="outline">
                            Activate All
                          </Button>
                        </form>
                        <form action={bulkUpdateStationCatalogStatus}>
                          <input type="hidden" name="stationId" value={station.id} />
                          <input type="hidden" name="active" value="false" />
                          <Button type="submit" variant="outline">
                            Deactivate All
                          </Button>
                        </form>
                      </div>
                    </div>

                    {station.stationStoreItems.map((item) => (
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
                                {(item.storeItem.basePriceCents / 100).toFixed(2)} - Image:{' '}
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
                    ))}
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-5 text-sm text-slate-500">
                    No products assigned to this station yet.
                  </div>
                )}
              </div>
            </details>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ProductPreview({
  imageUrl,
  name
}: {
  imageUrl: string | null;
  name: string;
}) {
  if (imageUrl) {
    return (
      <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-contain p-2"
          sizes="48px"
        />
      </div>
    );
  }

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-sm font-semibold uppercase text-slate-500">
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
