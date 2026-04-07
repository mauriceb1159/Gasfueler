'use client';

import { useEffect, useMemo, useState } from 'react';
import { Fuel, MapPinned, Navigation, Search } from 'lucide-react';

import { submitFuelRequest } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type StationSlot = {
  id: number;
  startAt: Date | string;
  endAt: Date | string;
  status: string;
};

type BookableStation = {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: string | null;
  longitude: string | null;
  supportsSnacks: boolean;
  fuelPrices: {
    id: number;
    fuelGrade: string;
    priceCents: number;
    source: string;
    recordedAt: Date | string;
  }[];
  serviceSlots: StationSlot[];
};

type VehicleRecord = {
  id: number;
  nickname: string | null;
  licensePlate: string;
  vehicleClass: string | null;
};

type NearbyGasStation = {
  id: string;
  name: string;
  address: string;
  googleMapsUri: string | null;
  latitude: number | null;
  longitude: number | null;
};

export function BookingForm({
  stations,
  vehicles,
  initialError
}: {
  stations: BookableStation[];
  vehicles: VehicleRecord[];
  initialError?: string;
}) {
  const [locationStatus, setLocationStatus] = useState<
    'idle' | 'locating' | 'granted' | 'denied' | 'unsupported'
  >('idle');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [zipFilter, setZipFilter] = useState('');
  const [selectedStationId, setSelectedStationId] = useState<number | null>(
    stations[0]?.id ?? null
  );
  const [nearbyStations, setNearbyStations] = useState<NearbyGasStation[]>([]);
  const [selectedNearbyStation, setSelectedNearbyStation] =
    useState<NearbyGasStation | null>(null);
  const [fuelGrade, setFuelGrade] = useState('regular');
  const [requestType, setRequestType] = useState('fill_tank');
  const [requestedGallons, setRequestedGallons] = useState('');
  const [requestedDollarAmount, setRequestedDollarAmount] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [vehicleClass, setVehicleClass] = useState('suv');
  const [nearbyStatus, setNearbyStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error' | 'unconfigured'
  >('idle');

  const visibleStations = useMemo(() => {
    const baseStations = stations
      .filter((station) =>
        zipFilter.trim() ? station.zip.startsWith(zipFilter.trim()) : true
      )
      .map((station) => ({
        ...station,
        distanceMiles: coords
          ? getDistanceMiles(
              coords.lat,
              coords.lng,
              Number(station.latitude),
              Number(station.longitude)
            )
          : null
      }));

    return baseStations.sort((a, b) => {
      if (a.distanceMiles === null && b.distanceMiles === null) {
        return a.name.localeCompare(b.name);
      }

      if (a.distanceMiles === null) return 1;
      if (b.distanceMiles === null) return -1;

      return a.distanceMiles - b.distanceMiles;
    });
  }, [coords, stations, zipFilter]);

  useEffect(() => {
    if (!visibleStations.find((station) => station.id === selectedStationId)) {
      setSelectedStationId(visibleStations[0]?.id ?? null);
    }
  }, [selectedStationId, visibleStations]);

  useEffect(() => {
    if (!coords) {
      return;
    }

    const activeCoords = coords;
    let cancelled = false;

    async function loadNearbyGasStations() {
      setNearbyStatus('loading');

      try {
        const response = await fetch(
          `/api/places/nearby-gas-stations?lat=${activeCoords.lat}&lng=${activeCoords.lng}`,
          { cache: 'no-store' }
        );

        const payload = await response.json();

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setNearbyStations([]);
          setNearbyStatus('error');
          return;
        }

        if (!payload.configured) {
          setNearbyStations([]);
          setNearbyStatus('unconfigured');
          return;
        }

        setNearbyStations(payload.places ?? []);
        setNearbyStatus('ready');
      } catch {
        if (!cancelled) {
          setNearbyStations([]);
          setNearbyStatus('error');
        }
      }
    }

    loadNearbyGasStations();

    return () => {
      cancelled = true;
    };
  }, [coords]);

  useEffect(() => {
    if (!selectedVehicleId) {
      return;
    }

    const vehicle = vehicles.find(
      (currentVehicle) => String(currentVehicle.id) === selectedVehicleId
    );

    if (vehicle?.vehicleClass) {
      setVehicleClass(vehicle.vehicleClass);
    }
  }, [selectedVehicleId, vehicles]);

  const selectedStation =
    visibleStations.find((station) => station.id === selectedStationId) ?? null;
  const selectedSlots = selectedStation?.serviceSlots ?? [];
  const selectedFuelPrice = selectedStation?.fuelPrices.find(
    (price) => price.fuelGrade === fuelGrade
  );
  const requestedGallonsNumber = Number(requestedGallons);
  const requestedDollarAmountNumber = Number(requestedDollarAmount);
  const selectedVehicleRecord =
    vehicles.find((vehicle) => String(vehicle.id) === selectedVehicleId) ?? null;
  const effectiveVehicleClass = vehicleClass || 'suv';
  const serviceFee = getServiceFeeForVehicleClass(effectiveVehicleClass);
  const estimatedFuelCost =
    requestType === 'gallons' &&
    selectedFuelPrice &&
    Number.isFinite(requestedGallonsNumber) &&
    requestedGallonsNumber > 0
      ? Math.round(selectedFuelPrice.priceCents * requestedGallonsNumber)
      : requestType === 'dollar_amount' &&
        Number.isFinite(requestedDollarAmountNumber) &&
        requestedDollarAmountNumber > 0
      ? Math.round(requestedDollarAmountNumber * 100)
      : null;
  const estimatedTotal =
    estimatedFuelCost !== null ? estimatedFuelCost + serviceFee : null;

  function handleUseLocation() {
    if (!navigator.geolocation) {
      setLocationStatus('unsupported');
      return;
    }

    setLocationStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setSelectedNearbyStation(null);
        setLocationStatus('granted');
      },
      () => {
        setLocationStatus('denied');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  if (stations.length === 0) {
    return <EmptyBookingState />;
  }

  return (
    <form action={submitFuelRequest} className="space-y-6 sm:space-y-7">
      {initialError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {initialError}
        </div>
      ) : null}

      <section className="space-y-4">
        <SectionTitle icon={MapPinned} title="1. Choose a station and time window" />
        <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-4 rounded-[1.25rem] border border-orange-100 bg-orange-50/70 p-4 sm:rounded-[1.5rem]">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-full bg-white sm:w-auto"
                onClick={handleUseLocation}
              >
                <Navigation className="mr-2 h-4 w-4" />
                Use my location
              </Button>
              <div className="relative min-w-[180px] flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={zipFilter}
                  onChange={(event) => setZipFilter(event.target.value)}
                  placeholder="Filter by ZIP"
                  className="h-11 rounded-full bg-white pl-10"
                />
              </div>
            </div>
            <p className="text-sm text-slate-600">
              {locationStatus === 'granted'
                ? 'Stations are sorted by distance from your current location.'
                : locationStatus === 'denied'
                ? 'Location access was denied. You can still search by ZIP code.'
                : locationStatus === 'unsupported'
                ? 'This browser does not support location access. Use ZIP code instead.'
                : 'Use location for nearest stations, or enter a ZIP code manually.'}
            </p>
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    GasFueler partner stations
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    These are the stations you can book right now with live
                    service slots.
                  </p>
                </div>
                {locationStatus === 'granted' ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Sorted by distance
                  </span>
                ) : null}
              </div>
              <div className="space-y-3">
                {visibleStations.map((station) => (
                  <button
                    key={station.id}
                    type="button"
                    onClick={() => {
                      setSelectedStationId(station.id);
                      setSelectedNearbyStation(null);
                    }}
                    className={`w-full rounded-[1.25rem] border p-4 text-left transition sm:p-5 ${
                      selectedStationId === station.id
                        ? 'border-slate-950 bg-white shadow-sm'
                        : 'border-orange-100 bg-white/80 hover:border-orange-200'
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-950">{station.name}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {station.address}, {station.city}, {station.state}
                        </p>
                      </div>
                      {station.distanceMiles !== null ? (
                        <span className="inline-flex w-fit rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                          {station.distanceMiles.toFixed(1)} mi
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                      <span className="rounded-full bg-slate-100 px-3 py-1 font-medium">
                        ZIP {station.zip}
                      </span>
                      <span className="rounded-full bg-orange-100 px-3 py-1 font-medium text-orange-700">
                        {station.serviceSlots.length} open slots
                      </span>
                      <span className="rounded-full bg-slate-950 px-3 py-1 font-medium text-white">
                        Bookable now
                      </span>
                      {station.supportsSnacks ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700">
                          Snack pickup available
                        </span>
                      ) : null}
                      {station.fuelPrices.length > 0 ? (
                        <span className="rounded-full bg-white px-3 py-1 font-medium text-slate-700">
                          From {formatCentsPerGallon(getLowestFuelPrice(station.fuelPrices))}
                        </span>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {locationStatus === 'granted' ? (
              <div className="rounded-[1.25rem] border border-slate-200 bg-white/90 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      More nearby gas stations
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Real stations discovered with Google Places. These are for
                      discovery today, not direct booking yet.
                    </p>
                  </div>
                  {nearbyStatus === 'loading' ? (
                    <span className="text-xs font-medium text-orange-600">
                      Loading...
                    </span>
                  ) : null}
                </div>

                {nearbyStatus === 'ready' && nearbyStations.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {nearbyStations.map((station) => (
                      <button
                        key={station.id}
                        type="button"
                        onClick={() => setSelectedNearbyStation(station)}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                          selectedNearbyStation?.id === station.id
                            ? 'border-slate-950 bg-white shadow-sm'
                            : 'border-slate-200 bg-slate-50 hover:border-orange-200'
                        }`}
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-medium text-slate-950">{station.name}</p>
                            <p className="mt-1 text-sm leading-6 text-slate-600">
                              {station.address}
                            </p>
                          </div>
                          {station.googleMapsUri ? (
                            <a
                              href={station.googleMapsUri}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm font-medium text-orange-700 underline-offset-4 hover:underline"
                            >
                              Open in Maps
                            </a>
                          ) : null}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}

                {nearbyStatus === 'ready' && nearbyStations.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-600">
                    No nearby gas stations were returned for this location yet.
                  </p>
                ) : null}

                {nearbyStatus === 'unconfigured' ? (
                  <p className="mt-4 text-sm text-slate-600">
                    Nearby real-world station search will appear once
                    `GOOGLE_MAPS_API_KEY` is added.
                  </p>
                ) : null}

                {nearbyStatus === 'error' ? (
                  <p className="mt-4 text-sm text-red-700">
                    We couldn&apos;t load nearby gas stations right now.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <input type="hidden" name="stationId" value={selectedStation?.id ?? ''} />
            <Field label="Selected station" htmlFor="selectedStation">
              <Input
                id="selectedStation"
                value={
                  selectedNearbyStation
                    ? `${selectedNearbyStation.name} - discovery only`
                    : selectedStation
                    ? `${selectedStation.name} - ${selectedStation.city}, ${selectedStation.state}`
                    : ''
                }
                readOnly
                className="h-11 rounded-full bg-slate-50"
              />
            </Field>
            {selectedNearbyStation ? (
              <p className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                {selectedNearbyStation.name} was selected from nearby Google
                results. Booking is still limited to GasFueler partner stations
                with live service slots, so choose one of the partner stations
                below to continue.
              </p>
            ) : null}
            {selectedStation ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-sm font-semibold text-slate-950">
                  Current station pricing
                </p>
                {selectedStation.fuelPrices.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedStation.fuelPrices.map((price) => (
                      <span
                        key={price.id}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          price.fuelGrade === fuelGrade
                            ? 'bg-slate-950 text-white'
                            : 'bg-white text-slate-700'
                        }`}
                      >
                        {formatFuelGrade(price.fuelGrade)} {formatCentsPerGallon(price.priceCents)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">
                    No current price has been loaded for this partner station yet.
                  </p>
                )}
              </div>
            ) : null}
            <Field label="Service slot" htmlFor="slotId">
              <select
                id="slotId"
                name="slotId"
                defaultValue={String(selectedSlots[0]?.id ?? '')}
                disabled={Boolean(selectedNearbyStation)}
                className="flex h-12 w-full rounded-2xl border border-input bg-white px-4 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:rounded-full"
              >
                {selectedSlots.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {formatSlot(slot.startAt, slot.endAt)}
                  </option>
                ))}
              </select>
            </Field>
            <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Start with nearby partner locations only. That keeps launch-market
              operations realistic while still giving drivers a useful location-based
              experience.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle icon={Fuel} title="2. Fuel details" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fuel grade" htmlFor="fuelGrade">
            <select
              id="fuelGrade"
              name="fuelGrade"
              value={fuelGrade}
              onChange={(event) => setFuelGrade(event.target.value)}
              className="flex h-12 w-full rounded-full border border-input bg-white px-4 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <option value="regular">Regular</option>
              <option value="midgrade">Midgrade</option>
              <option value="premium">Premium</option>
              <option value="diesel">Diesel</option>
            </select>
          </Field>
          <Field label="Request type" htmlFor="requestType">
            <select
              id="requestType"
              name="requestType"
              value={requestType}
              onChange={(event) => setRequestType(event.target.value)}
              className="flex h-12 w-full rounded-full border border-input bg-white px-4 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <option value="fill_tank">Fill tank</option>
              <option value="gallons">Exact gallons</option>
              <option value="dollar_amount">Dollar amount</option>
            </select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Requested gallons" htmlFor="requestedGallons">
            <Input
              id="requestedGallons"
              name="requestedGallons"
              type="number"
              min="1"
              value={requestedGallons}
              onChange={(event) => setRequestedGallons(event.target.value)}
              placeholder="Only if choosing gallons"
            />
          </Field>
          <Field label="Requested dollar amount" htmlFor="requestedDollarAmount">
            <Input
              id="requestedDollarAmount"
              name="requestedDollarAmount"
              type="number"
              min="1"
              value={requestedDollarAmount}
              onChange={(event) => setRequestedDollarAmount(event.target.value)}
              placeholder="Only if choosing dollar amount"
            />
          </Field>
        </div>
        <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-950">Order summary</p>
          <p className="mt-2">
            {selectedFuelPrice
              ? `${formatFuelGrade(fuelGrade)} is currently ${formatCentsPerGallon(
                  selectedFuelPrice.priceCents
                )} at ${selectedStation?.name}.`
              : 'Add a current station fuel price to unlock gallon-based estimates.'}
          </p>
          <div className="mt-4 rounded-2xl border border-white/70 bg-white/80 p-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-600">Vehicle type</span>
              <span className="font-semibold text-slate-950">
                {formatVehicleClass(effectiveVehicleClass)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-4">
              <span className="text-slate-600">Fuel subtotal</span>
              <span className="font-semibold text-slate-950">
                {formatEstimate(estimatedFuelCost)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-4">
              <span className="text-slate-600">Service fee</span>
              <span className="font-semibold text-slate-950">
                {formatCurrency(serviceFee)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-4">
              <span className="text-slate-600">Estimated tax</span>
              <span className="font-semibold text-slate-950">
                {formatTaxLabel(estimatedFuelCost)}
              </span>
            </div>
            <div className="mt-3 border-t border-orange-100 pt-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-base font-semibold text-slate-950">
                  Estimated total
                </span>
                <span className="text-base font-semibold text-slate-950">
                  {formatEstimate(estimatedTotal)}
                </span>
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Fuel pump prices already reflect the station&apos;s posted fuel taxes.
            Any additional taxes on service fees or add-ons can be added later at
            checkout once we finalize that flow.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle icon={Navigation} title="3. Vehicle details" />
        <Field label="Saved vehicle" htmlFor="vehicleId">
          <select
            id="vehicleId"
            name="vehicleId"
            value={selectedVehicleId}
            onChange={(event) => setSelectedVehicleId(event.target.value)}
            className="flex h-12 w-full rounded-full border border-input bg-white px-4 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <option value="">Add a new vehicle below</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.nickname || vehicle.licensePlate}
                {vehicle.vehicleClass
                  ? ` - ${formatVehicleClass(vehicle.vehicleClass)}`
                  : ''}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Vehicle nickname" htmlFor="nickname">
            <Input id="nickname" name="nickname" placeholder="Family SUV" />
          </Field>
          <Field label="License plate" htmlFor="licensePlate">
            <Input
              id="licensePlate"
              name="licensePlate"
              placeholder="Required for new vehicles"
            />
          </Field>
          <Field label="Vehicle type" htmlFor="vehicleClass">
            <select
              id="vehicleClass"
              name="vehicleClass"
              value={vehicleClass}
              onChange={(event) => setVehicleClass(event.target.value)}
              className="flex h-12 w-full rounded-full border border-input bg-white px-4 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <option value="car">Car</option>
              <option value="suv">SUV</option>
              <option value="truck">Truck</option>
            </select>
          </Field>
        </div>
        {selectedVehicleRecord ? (
          <p className="text-sm text-slate-500">
            Changing the vehicle type here will also update that saved vehicle for
            future bookings.
          </p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Make" htmlFor="make">
            <Input id="make" name="make" placeholder="Toyota" />
          </Field>
          <Field label="Model" htmlFor="model">
            <Input id="model" name="model" placeholder="Highlander" />
          </Field>
          <Field label="Color" htmlFor="color">
            <Input id="color" name="color" placeholder="Gray" />
          </Field>
        </div>
        <Field label="Fuel type" htmlFor="fuelType">
          <Input
            id="fuelType"
            name="fuelType"
            placeholder="Gasoline, hybrid, diesel, etc."
          />
        </Field>
        <Field label="Vehicle notes" htmlFor="vehicleNotes">
          <textarea
            id="vehicleNotes"
            name="vehicleNotes"
            rows={3}
            className="flex w-full rounded-3xl border border-input bg-transparent px-4 py-3 text-base shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            placeholder="Anything that helps the attendant find or identify your vehicle"
          />
        </Field>
      </section>

      <Field label="Arrival or special instructions" htmlFor="specialInstructions">
        <textarea
          id="specialInstructions"
          name="specialInstructions"
          rows={4}
          className="flex w-full rounded-3xl border border-input bg-transparent px-4 py-3 text-base shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          placeholder="Parking lot notes, pump side preferences, or instructions for the attendant"
        />
      </Field>

      <Button
        type="submit"
        className="h-12 w-full rounded-full bg-slate-950 px-6 text-white hover:bg-slate-800 sm:w-auto"
      >
        Save Fuel Request
      </Button>
    </form>
  );
}

export function EmptyBookingState() {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-orange-200 bg-orange-50/70 p-6 text-slate-700 sm:rounded-[1.75rem] sm:p-8">
      <h2 className="text-xl font-semibold text-slate-950 sm:text-2xl">
        No stations are loaded yet
      </h2>
      <p className="mt-3 max-w-2xl leading-7">
        The booking flow is wired to the real station and slot tables. Add your
        first partner station and service slots, then this page will immediately
        become usable for customer reservations.
      </p>
      <p className="mt-4 text-sm text-slate-500">
        This is intentional for the MVP: real scheduling data first, then
        customer bookings.
      </p>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title
}: {
  icon: typeof MapPinned;
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

function Field({
  label,
  htmlFor,
  children
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

function formatSlot(startAt: Date | string, endAt: Date | string) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  });

  return `${dateFormatter.format(start)} - ${timeFormatter.format(end)}`;
}

function getDistanceMiles(
  userLat: number,
  userLng: number,
  stationLat: number,
  stationLng: number
) {
  if (
    Number.isNaN(userLat) ||
    Number.isNaN(userLng) ||
    Number.isNaN(stationLat) ||
    Number.isNaN(stationLng)
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const dLat = toRadians(stationLat - userLat);
  const dLng = toRadians(stationLng - userLng);
  const lat1 = toRadians(userLat);
  const lat2 = toRadians(stationLat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(a));
}

function getLowestFuelPrice(
  prices: { fuelGrade: string; priceCents: number }[]
) {
  return prices.reduce((lowest, current) =>
    current.priceCents < lowest.priceCents ? current : lowest
  ).priceCents;
}

function formatFuelGrade(fuelGrade: string) {
  return fuelGrade
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatVehicleClass(vehicleClass: string) {
  return vehicleClass.toUpperCase() === 'SUV'
    ? 'SUV'
    : vehicleClass.charAt(0).toUpperCase() + vehicleClass.slice(1);
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100);
}

function formatCentsPerGallon(cents: number) {
  return `${formatCurrency(cents)}/gal`;
}

function formatEstimate(cents: number | null) {
  return cents === null ? 'TBD' : formatCurrency(cents);
}

function getServiceFeeForVehicleClass(vehicleClass: string) {
  switch (vehicleClass) {
    case 'car':
      return 699;
    case 'truck':
      return 1099;
    case 'suv':
    default:
      return 899;
  }
}

function formatTaxLabel(estimatedFuelCost: number | null) {
  return estimatedFuelCost === null ? 'TBD' : 'Included in fuel price';
}
