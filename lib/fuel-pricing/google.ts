import 'server-only';

export type GoogleFuelPrice = {
  fuelGrade: string;
  priceCents: number;
  source: 'google_places';
  recordedAt: Date;
};

type GoogleFuelType =
  | 'DIESEL'
  | 'MIDGRADE'
  | 'PREMIUM'
  | 'REGULAR_UNLEADED'
  | 'TRUCK_DIESEL';

type GoogleMoney = {
  units?: string | number;
  nanos?: number;
};

type GoogleFuelPriceRecord = {
  type?: GoogleFuelType;
  price?: GoogleMoney;
  updateTime?: string;
};

type GooglePlace = {
  id?: string;
  fuelOptions?: {
    fuelPrices?: GoogleFuelPriceRecord[];
  };
};

type GoogleTextSearchResponse = {
  places?: GooglePlace[];
};

const SUPPORTED_GOOGLE_FUEL_TYPES: Partial<Record<GoogleFuelType, string>> = {
  REGULAR_UNLEADED: 'regular',
  MIDGRADE: 'midgrade',
  PREMIUM: 'premium',
  DIESEL: 'diesel',
  TRUCK_DIESEL: 'diesel',
};

function convertGoogleMoneyToCents(price?: GoogleMoney) {
  if (!price) {
    return null;
  }

  const units =
    typeof price.units === 'string' ? Number(price.units) : (price.units ?? 0);
  const nanos = price.nanos ?? 0;

  if (!Number.isFinite(units) || !Number.isFinite(nanos)) {
    return null;
  }

  return Math.round(units * 100 + nanos / 10_000_000);
}

function mapGoogleFuelPrice(price: GoogleFuelPriceRecord) {
  if (!price.type) {
    return null;
  }

  const fuelGrade = SUPPORTED_GOOGLE_FUEL_TYPES[price.type];
  const priceCents = convertGoogleMoneyToCents(price.price);

  if (!fuelGrade || priceCents === null || priceCents <= 0) {
    return null;
  }

  return {
    fuelGrade,
    priceCents,
    source: 'google_places' as const,
    recordedAt: price.updateTime ? new Date(price.updateTime) : new Date(),
  };
}

export async function getGoogleFuelPricesForStation(station: {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return [];
  }

  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.fuelOptions'
    },
    body: JSON.stringify({
      textQuery: `${station.name}, ${station.address}, ${station.city}, ${station.state} ${station.zip}`,
      maxResultCount: 1,
      includedType: 'gas_station'
    }),
    cache: 'no-store'
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as GoogleTextSearchResponse;
  const firstPlace = payload.places?.[0];
  const fuelPrices = firstPlace?.fuelOptions?.fuelPrices ?? [];

  const mappedPrices = fuelPrices
    .map(mapGoogleFuelPrice)
    .filter((price): price is GoogleFuelPrice => price !== null);

  const seenGrades = new Set<string>();

  return mappedPrices.filter((price) => {
    if (seenGrades.has(price.fuelGrade)) {
      return false;
    }

    seenGrades.add(price.fuelGrade);
    return true;
  });
}
