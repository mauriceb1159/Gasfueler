'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Clock3, Search, ShoppingCart, Sparkles, Store, Tag } from 'lucide-react';

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
      slug: string;
      description: string | null;
      imageUrl: string | null;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategorySlug, setActiveCategorySlug] = useState<string>('all');
  const [activeCollection, setActiveCollection] = useState<
    'all' | 'best_sellers' | 'under_5' | 'essentials'
  >('all');
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
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const selectedStoreItemsPayload = JSON.stringify(
    Object.entries(selectedStoreItems)
      .map(([stationStoreItemId, quantity]) => ({
        stationStoreItemId: Number(stationStoreItemId),
        quantity,
      }))
      .filter((item) => item.quantity > 0)
  );

  const filteredStoreItems = useMemo(() => {
    const searchValue = deferredSearchTerm.trim().toLowerCase();

    return selectedStationStoreItems.filter((item) => {
      const matchesCategory =
        activeCategorySlug === 'all' ||
        item.storeItem.category.slug === activeCategorySlug;
      const matchesSearch =
        searchValue.length === 0 ||
        item.storeItem.name.toLowerCase().includes(searchValue) ||
        item.storeItem.description?.toLowerCase().includes(searchValue);
      const matchesCollection =
        activeCollection === 'all'
          ? true
          : activeCollection === 'under_5'
            ? item.priceCents <= 500
            : activeCollection === 'essentials'
              ? item.storeItem.category.slug === 'essentials'
              : item.priceCents >= 499;

      return matchesCategory && matchesSearch && matchesCollection;
    });
  }, [
    activeCategorySlug,
    activeCollection,
    deferredSearchTerm,
    selectedStationStoreItems,
  ]);

  const groupedStoreItems = useMemo(
    () =>
      filteredStoreItems.reduce<
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
    [filteredStoreItems]
  );

  const availableCategories = useMemo(
    () =>
      Array.from(
        new Map(
          selectedStationStoreItems.map((item) => [
            item.storeItem.category.slug,
            item.storeItem.category.name,
          ])
        ).entries()
      ).map(([slug, name]) => ({ slug, name })),
    [selectedStationStoreItems]
  );

  const featuredItems = useMemo(
    () =>
      [...selectedStationStoreItems]
        .sort((a, b) => {
          const inventoryA = a.inventoryCount ?? 999;
          const inventoryB = b.inventoryCount ?? 999;
          return inventoryA - inventoryB || b.priceCents - a.priceCents;
        })
        .slice(0, 4),
    [selectedStationStoreItems]
  );

  const cartItems = useMemo(
    () =>
      selectedStationStoreItems.filter((item) => (selectedStoreItems[item.id] ?? 0) > 0),
    [selectedStationStoreItems, selectedStoreItems]
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
    window.dispatchEvent(
      new CustomEvent('gasbite-market-cart:update', {
        detail: {
          count: selectedItemCount,
          subtotal,
          stationName: selectedStation?.name ?? null,
          items: cartItems.map((item) => ({
            id: item.id,
            name: item.storeItem.name,
            quantity: selectedStoreItems[item.id] ?? 0,
            subtotal: item.priceCents * (selectedStoreItems[item.id] ?? 0),
          })),
        },
      })
    );
  }, [cartItems, selectedItemCount, selectedStation?.name, selectedStoreItems, subtotal]);

  useEffect(() => {
    return () => {
      window.dispatchEvent(
        new CustomEvent('gasbite-market-cart:update', {
          detail: {
            count: 0,
            subtotal: 0,
            stationName: null,
            items: [],
          },
        })
      );
    };
  }, []);

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

      <form action={submitStoreOrder} className="space-y-6">
        <input type="hidden" name="stationId" value={selectedStation?.id ?? ''} />
        <input type="hidden" name="selectedStoreItems" value={selectedStoreItemsPayload} />

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
              <div className="overflow-hidden rounded-[1.5rem] border border-white/80 bg-white shadow-sm">
                <div className="bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.26),_transparent_42%),linear-gradient(135deg,#fff7ed_0%,#ffffff_58%,#fffbeb_100%)] p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700">
                        Market catalog
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                        Shop the station before you drive over
                      </h2>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                        Browse drinks, snacks, and essentials first, then lock in
                        pickup details when your cart is ready.
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 rounded-[1.2rem] border border-white/80 bg-white/90 p-3 text-center shadow-sm">
                      <Metric label="Products" value={selectedStationStoreItems.length} />
                      <Metric label="Collections" value={availableCategories.length} />
                      <Metric label="Cart" value={selectedItemCount} />
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Search cold drinks, chips, chargers, and more"
                        className="h-12 rounded-full border-white bg-white/95 pl-11 shadow-sm"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {collectionOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setActiveCollection(option.value)}
                          className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                            activeCollection === option.value
                              ? 'border-slate-950 bg-slate-950 text-white'
                              : 'border-white bg-white/90 text-slate-700 hover:border-orange-200 hover:bg-white'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {selectedStationStoreItems.length > 0 ? (
                <div className="grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)]">
                  <div className="space-y-4 rounded-[1.35rem] border border-white bg-white p-4 shadow-sm xl:sticky xl:top-6 xl:h-fit">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Browse
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">
                        Jump to a collection
                      </p>
                    </div>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setActiveCategorySlug('all')}
                        className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                          activeCategorySlug === 'all'
                            ? 'bg-slate-950 text-white'
                            : 'bg-slate-50 text-slate-700 hover:bg-orange-50 hover:text-slate-950'
                        }`}
                      >
                        All products
                      </button>
                      {availableCategories.map((category) => (
                        <button
                          key={category.slug}
                          type="button"
                          onClick={() => setActiveCategorySlug(category.slug)}
                          className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                            activeCategorySlug === category.slug
                              ? 'bg-slate-950 text-white'
                              : 'bg-slate-50 text-slate-700 hover:bg-orange-50 hover:text-slate-950'
                          }`}
                        >
                          {category.name}
                        </button>
                      ))}
                    </div>

                    <div className="rounded-[1.2rem] border border-orange-100 bg-orange-50/70 p-4">
                      <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">
                        <Sparkles className="h-3.5 w-3.5" />
                        Trending now
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        Fast-moving items stay at the top so customers can build a
                        quick pickup order in just a few taps.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {featuredItems.length > 0 ? (
                      <section className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Featured picks
                            </p>
                            <h3 className="mt-1 text-lg font-semibold text-slate-950">
                              Ready-to-grab favorites
                            </h3>
                          </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
                          {featuredItems.map((item) => (
                            <FeaturedStoreItemCard
                              key={item.id}
                              item={item}
                              quantity={selectedStoreItems[item.id] ?? 0}
                              onUpdateQuantity={updateStoreItemQuantity}
                            />
                          ))}
                        </div>
                      </section>
                    ) : null}

                    {Object.values(groupedStoreItems).length > 0 ? (
                      Object.values(groupedStoreItems).map((group) => (
                        <section key={group.categoryName} className="space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Category
                              </p>
                              <h3 className="mt-1 text-xl font-semibold text-slate-950">
                                {group.categoryName}
                              </h3>
                            </div>
                            <span className="text-xs text-slate-400">
                              {group.items.length} item{group.items.length === 1 ? '' : 's'}
                            </span>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            {group.items.map((item) => (
                              <StoreShelfCard
                                key={item.id}
                                item={item}
                                quantity={selectedStoreItems[item.id] ?? 0}
                                onUpdateQuantity={updateStoreItemQuantity}
                              />
                            ))}
                          </div>
                        </section>
                      ))
                    ) : (
                      <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white/80 p-5 text-sm text-slate-600">
                        No products match this search yet. Try another category or clear
                        the search to browse the full station catalog.
                      </div>
                    )}
                  </div>
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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1rem] bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function FeaturedStoreItemCard({
  item,
  quantity,
  onUpdateQuantity,
}: {
  item: StoreStation['stationStoreItems'][number];
  quantity: number;
  onUpdateQuantity: (stationStoreItemId: number, quantity: number) => void;
}) {
  return (
    <div className="rounded-[1.35rem] border border-white bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative overflow-hidden rounded-[1.2rem]">
        <ProductVisual item={item} size="featured" />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-700">
          Featured
          </span>
          <span className="rounded-full bg-slate-950/80 px-2.5 py-1 text-xs font-semibold text-white">
            {formatCurrency(item.priceCents)}
          </span>
        </div>
      </div>
      <div className="mt-4">
        <p className="font-semibold text-slate-950">{item.storeItem.name}</p>
        {item.storeItem.description ? (
          <p className="mt-1 text-sm leading-6 text-slate-500">
            {item.storeItem.description}
          </p>
        ) : null}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        {quantity > 0 ? (
          <QuantityStepper
            quantity={quantity}
            onDecrease={() => onUpdateQuantity(item.id, quantity - 1)}
            onIncrease={() => onUpdateQuantity(item.id, quantity + 1)}
          />
        ) : (
          <button
            type="button"
            onClick={() => onUpdateQuantity(item.id, 1)}
            className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-700 transition hover:bg-orange-100"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Add to cart
          </button>
        )}
        {quantity > 0 ? (
          <span className="text-sm font-medium text-orange-700">
            {formatCurrency(item.priceCents * quantity)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function StoreShelfCard({
  item,
  quantity,
  onUpdateQuantity,
}: {
  item: StoreStation['stationStoreItems'][number];
  quantity: number;
  onUpdateQuantity: (stationStoreItemId: number, quantity: number) => void;
}) {
  return (
    <div className="rounded-[1.25rem] border border-white bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="w-24 shrink-0">
          <ProductVisual item={item} size="compact" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-950">{item.storeItem.name}</p>
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
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <Tag className="h-3.5 w-3.5" />
            <span>{item.storeItem.category.name}</span>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            {quantity > 0 ? (
              <QuantityStepper
                quantity={quantity}
                onDecrease={() => onUpdateQuantity(item.id, quantity - 1)}
                onIncrease={() => onUpdateQuantity(item.id, quantity + 1)}
              />
            ) : (
              <button
                type="button"
                onClick={() => onUpdateQuantity(item.id, 1)}
                className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-medium text-orange-700 transition hover:bg-orange-100"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                Add to cart
              </button>
            )}
            {quantity > 0 ? (
              <span className="text-sm font-medium text-orange-700">
                {formatCurrency(item.priceCents * quantity)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductVisual({
  item,
  size,
}: {
  item: StoreStation['stationStoreItems'][number];
  size: 'featured' | 'compact';
}) {
  const theme = getProductVisualTheme(item);
  const isFeatured = size === 'featured';
  const imageUrl = resolveCatalogImageUrl(item.storeItem.imageUrl, item.storeItem.slug);

  if (imageUrl) {
    return (
      <div className="relative overflow-hidden rounded-[1.2rem] bg-[linear-gradient(145deg,#fff7ed_0%,#ffffff_45%,#fff1e6_100%)]">
        <div className={isFeatured ? 'h-28 p-3' : 'h-24 p-2.5'}>
          <div className="absolute inset-0 opacity-80">
            <div className="absolute -right-6 top-2 h-20 w-20 rounded-full bg-orange-200/70 blur-2xl" />
            <div className="absolute left-0 bottom-0 h-14 w-14 rounded-full bg-amber-200/70 blur-xl" />
          </div>
          <div className="relative h-full overflow-hidden rounded-[1rem] border border-white/70 bg-white/85 shadow-[0_18px_30px_-18px_rgba(15,23,42,0.6)]">
            <Image
              src={imageUrl}
              alt={item.storeItem.name}
              fill
              sizes={isFeatured ? '(min-width: 1536px) 220px, (min-width: 768px) 30vw, 45vw' : '96px'}
              className="object-cover"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-[1.2rem] ${theme.shellClass}`}>
      <div className={isFeatured ? 'h-28 p-4' : 'h-24 p-3'}>
        <div className="absolute inset-0 opacity-90">
          <div className={`absolute -right-6 top-3 h-20 w-20 rounded-full blur-2xl ${theme.glowClass}`} />
          <div className={`absolute -left-4 bottom-0 h-16 w-16 rounded-full blur-xl ${theme.glowClass}`} />
        </div>

        <div className="relative flex h-full items-end justify-between">
          <div className="space-y-2">
            <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${theme.pillClass}`}>
              {theme.label}
            </span>
            <div className={`${isFeatured ? 'h-16 w-12' : 'h-14 w-10'} rounded-[1rem] border border-white/60 shadow-[0_14px_24px_-14px_rgba(15,23,42,0.6)] ${theme.productClass}`} />
          </div>

          <div className="relative flex items-end gap-2">
            <div className={`${isFeatured ? 'h-11 w-11' : 'h-10 w-10'} rounded-[0.9rem] border border-white/60 ${theme.accentClass}`} />
            <div className={`${isFeatured ? 'h-9 w-9' : 'h-8 w-8'} rounded-[0.8rem] border border-white/60 bg-white/60`} />
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-2 left-3 right-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700/70">
          <span>{theme.shortLabel}</span>
          <span>{getStoreItemInitials(item.storeItem.name)}</span>
        </div>
      </div>
    </div>
  );
}

function QuantityStepper({
  quantity,
  onDecrease,
  onIncrease,
}: {
  quantity: number;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 p-1">
      <button
        type="button"
        onClick={onDecrease}
        className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-slate-600 transition hover:bg-white hover:text-slate-950"
      >
        -
      </button>
      <span className="min-w-10 text-center text-sm font-semibold text-slate-950">
        {quantity}
      </span>
      <button
        type="button"
        onClick={onIncrease}
        className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-slate-600 transition hover:bg-white hover:text-slate-950"
      >
        +
      </button>
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

function getProductVisualTheme(item: StoreStation['stationStoreItems'][number]) {
  const category = item.storeItem.category.slug;
  const name = item.storeItem.name.toLowerCase();

  if (category === 'drinks' || name.includes('coffee') || name.includes('water')) {
    return {
      label: 'Cold shelf',
      shortLabel: 'Refresh',
      shellClass: 'bg-[linear-gradient(145deg,#dbeafe_0%,#eff6ff_42%,#ffffff_100%)]',
      glowClass: 'bg-sky-300/70',
      pillClass: 'bg-white/85 text-sky-700',
      productClass: 'bg-[linear-gradient(180deg,#0f172a_0%,#2563eb_48%,#93c5fd_100%)]',
      accentClass: 'bg-[linear-gradient(180deg,#ffffff_0%,#dbeafe_100%)]',
    };
  }

  if (category === 'essentials' || name.includes('charger') || name.includes('wipes')) {
    return {
      label: 'Travel ready',
      shortLabel: 'Grab',
      shellClass: 'bg-[linear-gradient(145deg,#e2e8f0_0%,#f8fafc_48%,#ffffff_100%)]',
      glowClass: 'bg-slate-300/70',
      pillClass: 'bg-white/90 text-slate-700',
      productClass: 'bg-[linear-gradient(180deg,#334155_0%,#475569_52%,#cbd5e1_100%)]',
      accentClass: 'bg-[linear-gradient(180deg,#f8fafc_0%,#cbd5e1_100%)]',
    };
  }

  return {
    label: 'Fresh pick',
    shortLabel: 'Snack',
    shellClass: 'bg-[linear-gradient(145deg,#ffedd5_0%,#fff7ed_42%,#ffffff_100%)]',
    glowClass: 'bg-orange-300/70',
    pillClass: 'bg-white/90 text-orange-700',
    productClass: 'bg-[linear-gradient(180deg,#9a3412_0%,#ea580c_48%,#fdba74_100%)]',
    accentClass: 'bg-[linear-gradient(180deg,#fff7ed_0%,#fed7aa_100%)]',
  };
}

function getCatalogImageFallback(slug: string) {
  const catalogImages: Record<string, string> = {
    'kettle-chips': '/store-items/kettle-chips.svg',
    'doritos-nacho-cheese': '/store-items/doritos-nacho.jpg',
    'extramile-doritos-nacho-cheese': '/store-items/doritos-nacho.jpg',
    'protein-bar': '/store-items/protein-bar.svg',
    'cold-brew-coffee': '/store-items/cold-brew-coffee.svg',
    'sparkling-water': '/store-items/sparkling-water.svg',
    'windshield-wipes': '/store-items/windshield-wipes.svg',
    'phone-charger': '/store-items/phone-charger.svg',
  };

  return catalogImages[slug] ?? '';
}

function resolveCatalogImageUrl(imageUrl: string | null, slug: string) {
  const normalizedImageUrl = imageUrl?.trim() || '';

  if (
    normalizedImageUrl &&
    normalizedImageUrl !== '/store-items/item.svg'
  ) {
    return normalizedImageUrl;
  }

  return getCatalogImageFallback(slug);
}

const collectionOptions = [
  { value: 'all', label: 'All' },
  { value: 'best_sellers', label: 'Popular' },
  { value: 'under_5', label: 'Under $5' },
  { value: 'essentials', label: 'Essentials' },
] as const;
