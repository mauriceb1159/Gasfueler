import 'server-only';

import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import {
  type Station,
  type StationFuelPrice,
  stationFuelPrices
} from '@/lib/db/schema';
import { getRegionalFuelPricesForState } from '@/lib/fuel-pricing/eia';

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

export async function getEffectiveFuelPricesForStation(
  station: Pick<Station, 'id' | 'state'>
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

  const regionalPrices = await getRegionalFuelPricesForState(station.state);
  const manualGrades = new Set(manualPrices.map((price) => price.fuelGrade));

  const fallbackPrices = regionalPrices
    .filter((price) => !manualGrades.has(price.fuelGrade))
    .map((price, index) => ({
      id: -(station.id * 100 + index + 1),
      stationId: station.id,
      fuelGrade: price.fuelGrade,
      priceCents: price.priceCents,
      source: price.source,
      recordedAt: price.recordedAt
    }));

  return [...manualPrices, ...fallbackPrices];
}

export async function getEffectiveFuelPriceForStationGrade(
  station: Pick<Station, 'id' | 'state'>,
  fuelGrade: string
) {
  const prices = await getEffectiveFuelPricesForStation(station);
  return prices.find((price) => price.fuelGrade === fuelGrade) ?? null;
}
