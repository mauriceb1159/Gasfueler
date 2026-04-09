'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Clock3, ShoppingCart, Store } from 'lucide-react';

import { submitStoreOrder } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type StoreStation = {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  stationStoreItems: {
    id: number;
    priceCents: number;
    inventoryCount: number | null;
    storeItem: {
      id: number;
      name: string;
      description: string | null;
      category: {
        id: number;
        name: string;
        slug: string;
      };
    };
  }[];
};

type StoreOrder = {
  id: number;
  status: string;
  fulfillmentStatus: string;
  totalAmount: number;
  pickupMode: string | null;
  createdAt: Date | string;
  station: {
    name: string;
  } | null;
  orderItems: {
    id: number;
    itemName: string;
    quantity: number;
  }[];
};

export function MarketForm({
  stations,
  recentOrders,
  initialError,
  successOrderId,
}: {
  stations: StoreStation[];
  recentOrders: StoreOrder[];
  initialError?: string;
  successOrderId?: string;
}) {
  const [selectedStationId, setSelectedStationId] = useState<number | null>(
    stations[0]?.id ?? null
  );
  const [pickupMode, setPickupMode] = useState<'asap' | 'scheduled' | 'on_arrival'>(
    'asap'
  );
  const [pickupWindowStart, setPickupWindowStart] = useState('');
  const [pickupWindowEnd, setPickupWindowEnd] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [selectedStoreItems, setSelectedStoreItems] = useState<Record<number, number>>(
    {}
  );

  const selectedStation =
    stations.find((station) => station.id === selectedStationId) ?? null;
  const selectedStationStoreItems = selectedStation?.stationStoreItems ?? [];
  const selectedStoreItemsPayload = JSON.stringify(
    Object.entries(selectedStoreItems)
      .map(([stationStoreItemId, quantity]) => ({
        stationStoreItemId: Number(stationStoreItemId),
        quantity,
      }))
      .filter((item) => item.quantity > 0)
  );

  const groupedStoreItems = useMemo(
    () =>
      selectedStationStoreItems.reduce<
        Record<
          string,
          {
            categoryName: string;
            items: typeof selectedStationStoreItems;
          }
        >
      >((groups, item) => {
        const categoryKey = item.storeItem.category.slug;

        if (!groups[categoryKey]) {
          groups[categoryKey] = {
            categoryName: item.storeItem.category.name,
            items: [],
          };
        }

        groups[categoryKey].items.push(item);
        return groups;
      }, {}),
    [selectedStationStoreItems]
  );

  const selectedItemCount = Object.values(selectedStoreItems).reduce(
    (sum, quantity) => sum + quantity,
    0
  );
  const subtotal = selectedStationStoreItems.reduce((sum, item) => {
    const quantity = selectedStoreItems[item.id] ?? 0;
    return sum + item.priceCents * quantity;
  }, 0);

  useEffect(() => {
    const visibleStoreItemIds = new Set(selectedStationStoreItems.map((item) => item.id));

    setSelectedStoreItems((currentItems) => {
      const nextItems = Object.fromEntries(
        Object.entries(currentItems).filter(([key]) =>
          visibleStoreItemIds.has(Number(key))
        )
      );

      return Object.keys(nextItems).length === Object.keys(currentItems).length
        ? currentItems
        : nextItems;
    });
  }, [selectedStationStoreItems]);

  function updateStoreItemQuantity(stationStoreItemId: number, quantity: number) {
    setSelectedStoreItems((currentItems) => {
      if (quantity <= 0) {
        const nextItems = { ...currentItems };
        delete nextItems[stationStoreItemId];
        return nextItems;
      }

      return {
        ...currentItems,
        [stationStoreItemId]: quantity,
      };
    });
  }

  return (
    <div className="space-y-8">
      {successOrderId ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Store order #{successOrderId} was created successfully.
        </div>
      ) : null}
      {initialError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {initialError}
        </div>
      ) : null}

      <form action={submitStoreOrder} className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6">
        <input type="hidden" name="stationId" value={selectedStation?.id ?? ''} />
        <input type="hidden" name="selectedStoreItems" value={selectedStoreItemsPayload} />

        <div className="space-y-6">
          <section className="space-y-4">
            <SectionTitle icon={Store} title="Choose your pickup station" />
            <div className="grid gap-3 md:grid-cols-2">
              {stations.map((station) => (
                <button
                  key={station.id}
                  type="button"
                  onClick={() => setSelectedStationId(station.id)}
                  className={`rounded-[1.35rem] border p-4 text-left transition ${
                    selectedStationId === station.id
                      ? 'border-slate-950 bg-white shadow-sm'
                      : 'border-slate-200 bg-slate-50/70 hover:border-orange-200 hover:bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{station.name}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {station.address}, {station.city}, {station.state} {station.zip}
                      </p>
                    </div>
                    <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                      {station.stationStoreItems.length} items
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <SectionTitle icon={ShoppingCart} title="Build your cart" />
            <div className="space-y-5 rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
              <div className="rounded-[1.35rem] border border-white/80 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Market catalog
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-950">
                      Grab-and-go items ready at {selectedStation?.name}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                      Build a store-only order without going through the fuel booking
                      flow. Pickup instructions come next.
                    </p>
                  </div>
                  <div className="rounded-[1.1rem] border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      In bag
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">
                      {selectedItemCount} item{selectedItemCount === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
              </div>

              {selectedStationStoreItems.length > 0 ? (
                <div className="space-y-5">
                  {Object.values(groupedStoreItems).map((group) => (
                    <div key={group.categoryName} className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {group.categoryName}
                        </h3>
                        <span className="text-xs text-slate-400">
                          {group.items.length} item{group.items.length === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {group.items.map((item) => {
                          const quantity = selectedStoreItems[item.id] ?? 0;

                          return (
                            <div
                              key={item.id}
                              className="rounded-[1.25rem] border border-white bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-100 via-amber-50 to-white text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-700">
                                  {getStoreItemInitials(item.storeItem.name)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="font-semibold text-slate-950">
                                        {item.storeItem.name}
                                      </p>
                                      {item.storeItem.description ? (
                                        <p className="mt-1 text-sm leading-6 text-slate-500">
                                          {item.storeItem.description}
                                        </p>
                                      ) : null}
                                    </div>
                                    <span className="shrink-0 text-sm font-semibold text-slate-950">
                                      {formatCurrency(item.priceCents)}
                                    </span>
                                  </div>
                                  <div className="mt-4 flex items-center justify-between gap-3">
                                    <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 p-1">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateStoreItemQuantity(item.id, quantity - 1)
                                        }
                                        className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-slate-600 transition hover:bg-white hover:text-slate-950"
                                      >
                                        -
                                      </button>
                                      <span className="min-w-10 text-center text-sm font-semibold text-slate-950">
                                        {quantity}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateStoreItemQuantity(item.id, quantity + 1)
                                        }
                                        className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-slate-600 transition hover:bg-white hover:text-slate-950"
                                      >
                                        +
                                      </button>
                                    </div>
                                    {quantity > 0 ? (
                                      <span className="text-sm font-medium text-orange-700">
                                        {formatCurrency(item.priceCents * quantity)}
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => updateStoreItemQuantity(item.id, 1)}
                                        className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-medium text-orange-700 transition hover:bg-orange-100"
                                      >
                                        <ShoppingCart className="h-3.5 w-3.5" />
                                        Add to cart
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white/80 p-5 text-sm text-slate-600">
                  This station does not have a market catalog loaded yet.
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <SectionTitle icon={Clock3} title="Pickup details" />
            <div className="grid gap-3 md:grid-cols-3">
              <PickupModeCard
                title="ASAP"
                description="Prep it right away."
                selected={pickupMode === 'asap'}
                onSelect={() => setPickupMode('asap')}
              />
              <PickupModeCard
                title="Scheduled"
                description="Choose a pickup window."
                selected={pickupMode === 'scheduled'}
                onSelect={() => setPickupMode('scheduled')}
              />
              <PickupModeCard
                title="On arrival"
                description="We start when you pull in."
                selected={pickupMode === 'on_arrival'}
                onSelect={() => setPickupMode('on_arrival')}
              />
            </div>
            <input type="hidden" name="pickupMode" value={pickupMode} />

            {pickupMode === 'scheduled' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Pickup window start" htmlFor="pickupWindowStart">
                  <Input
                    id="pickupWindowStart"
                    name="pickupWindowStart"
                    type="datetime-local"
                    value={pickupWindowStart}
                    onChange={(event) => setPickupWindowStart(event.target.value)}
                  />
                </Field>
                <Field label="Pickup window end" htmlFor="pickupWindowEnd">
                  <Input
                    id="pickupWindowEnd"
                    name="pickupWindowEnd"
                    type="datetime-local"
                    value={pickupWindowEnd}
                    onChange={(event) => setPickupWindowEnd(event.target.value)}
                  />
                </Field>
              </div>
            ) : null}

            <Field label="Pickup notes" htmlFor="customerNotes">
              <textarea
                id="customerNotes"
                name="customerNotes"
                rows={4}
                value={customerNotes}
                onChange={(event) => setCustomerNotes(event.target.value)}
                className="flex w-full rounded-3xl border border-input bg-transparent px-4 py-3 text-base shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                placeholder="Arrival notes, curbside details, or anything the store team should know"
              />
            </Field>
          </section>

          <Button
            type="submit"
            className="h-12 w-full rounded-full bg-slate-950 px-6 text-white hover:bg-slate-800 sm:w-auto"
          >
            Place store order
          </Button>
        </div>

        <aside className="mt-6 lg:mt-0">
          <div className="rounded-[1.5rem] border border-orange-200 bg-orange-50 p-4 text-sm text-slate-700 lg:sticky lg:top-6">
            <p className="font-semibold text-slate-950">Bag summary</p>
            <p className="mt-2">
              {selectedStation
                ? `Pickup will be coordinated through ${selectedStation.name}.`
                : 'Choose a station to start your order.'}
            </p>
            <div className="mt-4 rounded-2xl border border-white/70 bg-white/80 p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-600">Pickup mode</span>
                <span className="font-semibold text-slate-950">
                  {formatPickupMode(pickupMode)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-4">
                <span className="text-slate-600">Items</span>
                <span className="font-semibold text-slate-950">{selectedItemCount}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-4">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-semibold text-slate-950">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <div className="mt-3 border-t border-orange-100 pt-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-base font-semibold text-slate-950">Estimated total</span>
                  <span className="text-base font-semibold text-slate-950">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
              </div>
            </div>

            {selectedItemCount > 0 ? (
              <div className="mt-4 rounded-2xl border border-white/70 bg-white/80 p-4">
                <p className="text-sm font-semibold text-slate-950">In your bag</p>
                <div className="mt-3 space-y-2">
                  {selectedStationStoreItems
                    .filter((item) => (selectedStoreItems[item.id] ?? 0) > 0)
                    .map((item) => {
                      const quantity = selectedStoreItems[item.id] ?? 0;

                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-4 text-sm"
                        >
                          <span className="text-slate-600">
                            {item.storeItem.name} x{quantity}
                          </span>
                          <span className="font-medium text-slate-950">
                            {formatCurrency(item.priceCents * quantity)}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : null}
          </div>
        </aside>
      </form>

      {recentOrders.length > 0 ? (
        <section className="space-y-4">
          <SectionTitle icon={Clock3} title="Recent store orders" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      Order #{order.id}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {order.station?.name || 'Station pending'}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {order.fulfillmentStatus}
                  </span>
                </div>
                <div className="mt-3 text-sm text-slate-600">
                  <p>{formatPickupMode(order.pickupMode || 'asap')}</p>
                  <p className="mt-1">{formatCurrency(order.totalAmount)}</p>
                </div>
                <div className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600">
                  {order.orderItems.slice(0, 3).map((item) => (
                    <p key={item.id}>
                      {item.itemName} x{item.quantity}
                    </p>
                  ))}
                </div>
                <Link
                  href={`/market/orders/${order.id}`}
                  className="mt-4 inline-flex text-sm font-medium text-orange-700 underline-offset-4 hover:underline"
                >
                  View order details
                </Link>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function EmptyMarketState() {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-orange-200 bg-orange-50/70 p-6 text-slate-700 sm:rounded-[1.75rem] sm:p-8">
      <h2 className="text-xl font-semibold text-slate-950 sm:text-2xl">
        No market stations are loaded yet
      </h2>
      <p className="mt-3 max-w-2xl leading-7">
        Add station store items to a partner location and this store-only flow will
        be ready for customer orders.
      </p>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: typeof Store;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="text-lg font-semibold text-slate-950 sm:text-xl">{title}</h2>
    </div>
  );
}

function PickupModeCard({
  title,
  description,
  selected,
  onSelect,
}: {
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-[1.2rem] border p-4 text-left transition ${
        selected
          ? 'border-slate-950 bg-white shadow-sm'
          : 'border-slate-200 bg-slate-50/70 hover:border-orange-200 hover:bg-white'
      }`}
    >
      <p className="font-semibold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </button>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function formatPickupMode(value: string) {
  if (value === 'on_arrival') {
    return 'On arrival';
  }

  if (value === 'scheduled') {
    return 'Scheduled';
  }

  return 'ASAP';
}

function getStoreItemInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();
}
