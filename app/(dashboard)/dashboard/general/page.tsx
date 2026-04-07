'use client';

import { useEffect, useMemo } from 'react';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { updateAccount } from '@/app/(login)/actions';
import { User } from '@/lib/db/schema';
import useSWR from 'swr';
import { Suspense } from 'react';
import { saveStationFuelPrices } from './actions';

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
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    saveStationFuelPrices,
    {}
  );
  const isOwner = user?.role === 'owner';
  const defaultStationId = stations?.[0]?.id ? String(stations[0].id) : '';

  useEffect(() => {
    if (state.success) {
      mutate();
    }
  }, [mutate, state.success]);

  const stationSummaries = useMemo(
    () =>
      (stations ?? []).map((station) => ({
        ...station,
        latestPrices: getLatestStationPrices(station.fuelPrices)
      })),
    [stations]
  );

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Partner Station Fuel Prices</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Enter the latest manual prices for your partner stations. The booking
          flow uses these values to show current price chips and estimate fuel
          totals before checkout.
        </p>

        <form className="space-y-4" action={formAction}>
          <div>
            <Label htmlFor="stationId" className="mb-2">
              Partner station
            </Label>
            <select
              id="stationId"
              name="stationId"
              defaultValue={defaultStationId}
              className="flex h-12 w-full rounded-2xl border border-input bg-white px-4 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              disabled={!isOwner || isPending || !stations?.length}
            >
              {(stations ?? []).map((station) => (
                <option key={station.id} value={station.id}>
                  {station.name} - {station.city}, {station.state}
                </option>
              ))}
            </select>
          </div>

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

          {state.error && <p className="text-red-500 text-sm">{state.error}</p>}
          {state.success && (
            <p className="text-green-600 text-sm">{state.success}</p>
          )}

          <Button
            type="submit"
            className="bg-orange-500 hover:bg-orange-600 text-white"
            disabled={isPending || !isOwner}
          >
            {isPending ? (
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
            Current partner-station prices
          </p>
          {(stationSummaries ?? []).length > 0 ? (
            <div className="space-y-3">
              {stationSummaries.map((station) => (
                <div
                  key={station.id}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                >
                  <p className="font-medium text-gray-900">
                    {station.name} - {station.city}, {station.state}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {station.latestPrices.length > 0 ? (
                      station.latestPrices.map((price) => (
                        <span
                          key={`${station.id}-${price.fuelGrade}`}
                          className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                        >
                          {formatFuelGrade(price.fuelGrade)} {formatCurrency(price.priceCents)}/gal
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

export default function GeneralPage() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateAccount,
    {}
  );

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

      <StationFuelPricing />
    </section>
  );
}
