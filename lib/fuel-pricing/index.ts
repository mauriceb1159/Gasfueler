import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import {
  type Station,
  type StationFuelPrice,
  stationFuelPrices
} from '@/lib/db/schema';
import { getRegionalFuelPricesForState } from '@/lib/fuel-pricing/eia';
import { getGoogleFuelPricesForStation } from '@/lib/fuel-pricing/google';

type EffectiveFuelPrice = Pick<
  StationFuelPrice,
  'id' | 'stationId' | 'fuelGrade' | 'priceCents' | 'source' | 'recordedAt'
>;

function dedupeFuelGrades(prices: EffectiveFuelPrice[]) {
  const seenGrades = new Set<string>();

  return prices.filter((price) => {
    if (seenGrades.has(price.fuelGrade)) {
      return false;
    }

    seenGrades.add(price.fuelGrade);
    return true;
  });
}

function normalizeGooglePrices(
  stationId: number,
  prices: Awaited<ReturnType<typeof getGoogleFuelPricesForStation>>,
  idSeed: number
) {
  return prices.map((price, index) => ({
    id: -(stationId * idSeed + index + 1),
    stationId,
    fuelGrade: price.fuelGrade,
    priceCents: price.priceCents,
    source: price.source,
    recordedAt: price.recordedAt
  }));
}

export async function getEffectiveFuelPricesForStation(
  station: Pick<
    Station,
    'id' | 'name' | 'address' | 'city' | 'state' | 'zip' | 'fuelPriceMode'
  >
) {
  const manualPrices = dedupeFuelGrades(
    await db
      .select({
        id: stationFuelPrices.id,
        stationId: stationFuelPrices.stationId,
        fuelGrade: stationFuelPrices.fuelGrade,
        priceCents: stationFuelPrices.priceCents,
        source: stationFuelPrices.source,
        recordedAt: stationFuelPrices.recordedAt
      })
      .from(stationFuelPrices)
      .where(eq(stationFuelPrices.stationId, station.id))
      .orderBy(desc(stationFuelPrices.recordedAt))
  );

  const googlePrices = await getGoogleFuelPricesForStation(station);
  const normalizedGooglePrices = normalizeGooglePrices(station.id, googlePrices, 1_000);
  const preferGooglePrices = station.fuelPriceMode === 'google_first';
  const primaryPrices = preferGooglePrices ? normalizedGooglePrices : manualPrices;
  const secondaryPrices = preferGooglePrices ? manualPrices : normalizedGooglePrices;
  const primaryGrades = new Set(primaryPrices.map((price) => price.fuelGrade));
  const secondaryFallbackPrices = secondaryPrices
    .filter((price) => !primaryGrades.has(price.fuelGrade))
    .map((price) => price);

  const regionalPrices = await getRegionalFuelPricesForState(station.state);
  const takenGrades = new Set([
    ...primaryPrices.map((price) => price.fuelGrade),
    ...secondaryFallbackPrices.map((price) => price.fuelGrade)
  ]);

  const fallbackPrices = regionalPrices
    .filter((price) => !takenGrades.has(price.fuelGrade))
    .map((price, index) => ({
      id: -(station.id * 10_000 + index + 1),
      stationId: station.id,
      fuelGrade: price.fuelGrade,
      priceCents: price.priceCents,
      source: price.source,
      recordedAt: price.recordedAt
    }));

  return [...primaryPrices, ...secondaryFallbackPrices, ...fallbackPrices];
}

export async function getEffectiveFuelPriceForStationGrade(
  station: Pick<
    Station,
    'id' | 'name' | 'address' | 'city' | 'state' | 'zip' | 'fuelPriceMode'
  >,
  fuelGrade: string
) {
  const prices = await getEffectiveFuelPricesForStation(station);
  return prices.find((price) => price.fuelGrade === fuelGrade) ?? null;
}
