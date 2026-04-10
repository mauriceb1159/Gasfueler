'use client';

import { useEffect, useMemo, useState } from 'react';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { updateAccount } from '@/app/(login)/actions';
import { StationFuelPriceMode, User } from '@/lib/db/schema';
import useSWR from 'swr';
import { Suspense } from 'react';
import {
  createPartnerStation,
  saveStationFuelPriceMode,
  saveStationFuelPrices
} from './actions';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type ActionState = {
  name?: string;
  error?: string;
  success?: string;
};

type StationPricingRecord = {
  id: number;
  fuelGrade: string;
  priceCents: number;
  source: string;
  recordedAt: string;
};

type StationRecord = {
  id: number;
  name: string;
  city: string;
  state: string;
  fuelPriceMode: string;
  fuelPrices: StationPricingRecord[];
};

type AccountFormProps = {
  state: ActionState;
  nameValue?: string;
  emailValue?: string;
};

function AccountForm({
  state,
  nameValue = '',
  emailValue = ''
}: AccountFormProps) {
  return (
    <>
      <div>
        <Label htmlFor="name" className="mb-2">
          Name
        </Label>
        <Input
          id="name"
          name="name"
          placeholder="Enter your name"
          defaultValue={state.name || nameValue}
          required
        />
      </div>
      <div>
        <Label htmlFor="email" className="mb-2">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="Enter your email"
          defaultValue={emailValue}
          required
        />
      </div>
    </>
  );
}

function AccountFormWithData({ state }: { state: ActionState }) {
  const { data: user } = useSWR<User>('/api/user', fetcher);
  return (
    <AccountForm
      state={state}
      nameValue={user?.name ?? ''}
      emailValue={user?.email ?? ''}
    />
  );
}

function StationFuelPricing() {
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const { data: stations, mutate } = useSWR<StationRecord[]>('/api/stations', fetcher);
  const [priceState, priceFormAction, isPricePending] = useActionState<ActionState, FormData>(
    saveStationFuelPrices,
    {}
  );
  const [modeState, modeFormAction, isModePending] = useActionState<ActionState, FormData>(
    saveStationFuelPriceMode,
    {}
  );
  const isOwner = user?.role === 'owner';
  const [selectedStationId, setSelectedStationId] = useState('');
  const defaultStationId = stations?.[0]?.id ? String(stations[0].id) : '';

  useEffect(() => {
    if (!selectedStationId && defaultStationId) {
      setSelectedStationId(defaultStationId);
    }
  }, [defaultStationId, selectedStationId]);

  useEffect(() => {
    if (priceState.success || modeState.success) {
      mutate();
    }
  }, [modeState.success, mutate, priceState.success]);

  const stationSummaries = useMemo(
    () =>
      (stations ?? []).map((station) => ({
        ...station,
        latestPrices: getLatestStationPrices(station.fuelPrices)
      })),
    [stations]
  );
  const selectedStation = useMemo(
    () =>
      (stations ?? []).find((station) => String(station.id) === selectedStationId) ??
      null,
    [selectedStationId, stations]
  );
  const pricingModeLabel = selectedStation?.fuelPriceMode === StationFuelPriceMode.GOOGLE_FIRST
    ? 'Google first'
    : 'Manual first';

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Partner Station Fuel Prices</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Enter the partner-station prices Gasbite should use for booking
          estimates. These values override the regional fallback feed, so
          station-specific updates always win when both are available.
        </p>
        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
            * Station-set
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
            G Google
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
            ~ Regional fallback
          </span>
        </div>
        <p className="text-xs leading-5 text-slate-500">
          Google-backed prices can refresh on roughly a daily cadence. Gasbite uses
          station-set prices first, then Google, then the regional fallback only
          when nothing better is available.
        </p>

        <div className="space-y-2">
          <Label htmlFor="stationId" className="mb-2">
            Partner station
          </Label>
          <select
            id="stationId"
            value={selectedStationId}
            onChange={(event) => setSelectedStationId(event.target.value)}
            className="flex h-12 w-full rounded-2xl border border-input bg-white px-4 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            disabled={!isOwner || (!stations?.length && !defaultStationId)}
          >
            {(stations ?? []).map((station) => (
              <option key={station.id} value={station.id}>
                {station.name} - {station.city}, {station.state}
              </option>
            ))}
          </select>
        </div>

        <form className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-4" action={modeFormAction}>
          <input type="hidden" name="stationId" value={selectedStationId} />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <Label htmlFor="fuelPriceMode">Fuel price source priority</Label>
              <select
                id="fuelPriceMode"
                name="fuelPriceMode"
                defaultValue={selectedStation?.fuelPriceMode ?? StationFuelPriceMode.MANUAL_FIRST}
                key={`${selectedStationId}-${selectedStation?.fuelPriceMode ?? 'manual_first'}`}
                className="flex h-12 min-w-[240px] rounded-2xl border border-input bg-white px-4 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                disabled={!isOwner || isModePending || !selectedStationId}
              >
                <option value={StationFuelPriceMode.MANUAL_FIRST}>Manual first</option>
                <option value={StationFuelPriceMode.GOOGLE_FIRST}>Google first</option>
              </select>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              Current mode: <span className="font-semibold text-slate-950">{pricingModeLabel}</span>
            </div>
          </div>

          {modeState.error && <p className="text-sm text-red-500">{modeState.error}</p>}
          {modeState.success && <p className="text-sm text-green-600">{modeState.success}</p>}

          <Button
            type="submit"
            className="bg-slate-900 text-white hover:bg-slate-800"
            disabled={!isOwner || isModePending || !selectedStationId}
          >
            {isModePending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving source...
              </>
            ) : (
              'Save Pricing Source'
            )}
          </Button>
        </form>

        <form className="space-y-4" action={priceFormAction}>
          <input type="hidden" name="stationId" value={selectedStationId} />

          <div className="grid gap-4 sm:grid-cols-2">
            <PriceField
              id="regularPrice"
              name="regularPrice"
              label="Regular"
              placeholder="3.99"
            />
            <PriceField
              id="midgradePrice"
              name="midgradePrice"
              label="Midgrade"
              placeholder="4.19"
            />
            <PriceField
              id="premiumPrice"
              name="premiumPrice"
              label="Premium"
              placeholder="4.39"
            />
            <PriceField
              id="dieselPrice"
              name="dieselPrice"
              label="Diesel"
              placeholder="4.59"
            />
          </div>

          {priceState.error && <p className="text-red-500 text-sm">{priceState.error}</p>}
          {priceState.success && (
            <p className="text-green-600 text-sm">{priceState.success}</p>
          )}

          <Button
            type="submit"
            className="bg-orange-500 hover:bg-orange-600 text-white"
            disabled={isPricePending || !isOwner || !selectedStationId}
          >
            {isPricePending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving prices...
              </>
            ) : (
              'Save Fuel Prices'
            )}
          </Button>
        </form>

        <div className="space-y-4">
          <p className="text-sm font-medium text-gray-900">
            Active partner-station estimate prices
          </p>
          {(stationSummaries ?? []).length > 0 ? (
            <div className="space-y-3">
              {stationSummaries.map((station) => (
                <div
                  key={station.id}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-gray-900">
                      {station.name} - {station.city}, {station.state}
                    </p>
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {station.fuelPriceMode === StationFuelPriceMode.GOOGLE_FIRST
                        ? 'Google first'
                        : 'Manual first'}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {station.latestPrices.length > 0 ? (
                      station.latestPrices.map((price) => (
                        <span
                          key={`${station.id}-${price.fuelGrade}`}
                          className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                          title={formatSourceTooltip(price.source)}
                          aria-label={formatSourceTooltip(price.source)}
                        >
                          {formatFuelGrade(price.fuelGrade)} {formatCurrency(price.priceCents)}/gal{' '}
                          {formatSourceMarker(price.source)}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        No prices loaded yet
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No active partner stations are loaded yet.
            </p>
          )}
        </div>

        {!isOwner && (
          <p className="text-sm text-muted-foreground">
            You must be a team owner to update partner-station prices.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function PriceField({
  id,
  name,
  label,
  placeholder
}: {
  id: string;
  name: string;
  label: string;
  placeholder: string;
}) {
  return (
    <div>
      <Label htmlFor={id} className="mb-2">
        {label}
      </Label>
      <Input id={id} name={name} placeholder={placeholder} inputMode="decimal" />
    </div>
  );
}

function getLatestStationPrices(prices: StationPricingRecord[]) {
  const seenGrades = new Set<string>();

  return prices.filter((price) => {
    if (seenGrades.has(price.fuelGrade)) {
      return false;
    }

    seenGrades.add(price.fuelGrade);
    return true;
  });
}

function formatFuelGrade(fuelGrade: string) {
  return fuelGrade
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100);
}

function formatSourceMarker(source: string) {
  if (source === 'manual') {
    return '*';
  }

  if (source === 'google_places') {
    return 'G';
  }

  if (source === 'regional_eia') {
    return '~';
  }

  return '.';
}

function formatSourceTooltip(source: string) {
  if (source === 'manual') {
    return 'Station-set price';
  }

  if (source === 'google_places') {
    return 'Google fuel price';
  }

  if (source === 'regional_eia') {
    return 'Regional fallback price';
  }

  return 'Price source';
}

export default function GeneralPage() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateAccount,
    {}
  );
  const [stationState, stationFormAction, isStationPending] = useActionState<
    ActionState,
    FormData
  >(createPartnerStation, {});

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">
        General Settings
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" action={formAction}>
            <Suspense fallback={<AccountForm state={state} />}>
              <AccountFormWithData state={state} />
            </Suspense>
            {state.error && (
              <p className="text-red-500 text-sm">{state.error}</p>
            )}
            {state.success && (
              <p className="text-green-500 text-sm">{state.success}</p>
            )}
            <Button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Add Partner Station</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" action={stationFormAction}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="stationName" className="mb-2">
                  Station name
                </Label>
                <Input
                  id="stationName"
                  name="name"
                  placeholder="EXTRAMILE #97947"
                  defaultValue="EXTRAMILE #97947"
                />
              </div>
              <div>
                <Label htmlFor="stationZip" className="mb-2">
                  ZIP code
                </Label>
                <Input
                  id="stationZip"
                  name="zip"
                  placeholder="95682-8455"
                  defaultValue="95682-8455"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="stationAddress" className="mb-2">
                Street address
              </Label>
              <Input
                id="stationAddress"
                name="address"
                placeholder="3381 COACH LN"
                defaultValue="3381 COACH LN"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="stationCity" className="mb-2">
                  City
                </Label>
                <Input
                  id="stationCity"
                  name="city"
                  placeholder="CAMERON PARK"
                  defaultValue="CAMERON PARK"
                />
              </div>
              <div>
                <Label htmlFor="stationState" className="mb-2">
                  State
                </Label>
                <Input
                  id="stationState"
                  name="state"
                  placeholder="CA"
                  defaultValue="CA"
                />
              </div>
            </div>

            {stationState.error && (
              <p className="text-sm text-red-500">{stationState.error}</p>
            )}
            {stationState.success && (
              <p className="text-sm text-green-600">{stationState.success}</p>
            )}

            <Button
              type="submit"
              className="bg-slate-900 text-white hover:bg-slate-800"
              disabled={isStationPending}
            >
              {isStationPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding station...
                </>
              ) : (
                'Add Partner Station'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <StationFuelPricing />
    </section>
  );
}
