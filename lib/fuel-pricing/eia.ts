export type RegionalFuelPrice = {
  fuelGrade: string;
  priceCents: number;
  source: 'regional_eia';
  recordedAt: Date;
};

const CALIFORNIA_SERIES_IDS: Record<string, string> = {
  regular: 'EMM_EPMR_PTE_SCA_DPG',
  midgrade: 'EMM_EPMM_PTE_SCA_DPG',
  premium: 'EMM_EPMP_PTE_SCA_DPG',
  diesel: 'EMD_EPD2D_PTE_SCA_DPG'
};

type EiaSeriesResponse = {
  response?: {
    data?: Array<{
      period?: string;
      value?: string;
    }>;
  };
};

function getSeriesIdsForState(state: string) {
  if (state.toUpperCase() === 'CA') {
    return CALIFORNIA_SERIES_IDS;
  }

  return null;
}

async function fetchLatestSeriesPoint(seriesId: string, apiKey: string) {
  const url = new URL(`https://api.eia.gov/v2/seriesid/${seriesId}`);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('length', '1');
  url.searchParams.set('sort[0][column]', 'period');
  url.searchParams.set('sort[0][direction]', 'desc');

  const response = await fetch(url, {
    next: { revalidate: 60 * 60 * 6 }
  });

  if (!response.ok) {
    throw new Error(`EIA fuel price request failed for ${seriesId}.`);
  }

  const payload = (await response.json()) as EiaSeriesResponse;
  const row = payload.response?.data?.[0];

  if (!row?.value) {
    return null;
  }

  const dollarsPerGallon = Number(row.value);

  if (!Number.isFinite(dollarsPerGallon) || dollarsPerGallon <= 0) {
    return null;
  }

  return {
    recordedAt: row.period ? new Date(`${row.period}`) : new Date(),
    priceCents: Math.round(dollarsPerGallon * 100)
  };
}

export async function getRegionalFuelPricesForState(state: string) {
  const apiKey = process.env.EIA_API_KEY;
  const seriesIds = getSeriesIdsForState(state);

  if (!apiKey || !seriesIds) {
    return [];
  }

  const entries = await Promise.all(
    Object.entries(seriesIds).map(async ([fuelGrade, seriesId]) => {
      const latestPoint = await fetchLatestSeriesPoint(seriesId, apiKey);

      if (!latestPoint) {
        return null;
      }

      return {
        fuelGrade,
        priceCents: latestPoint.priceCents,
        source: 'regional_eia' as const,
        recordedAt: latestPoint.recordedAt
      };
    })
  );

  return entries.filter(
    (entry): entry is RegionalFuelPrice => entry !== null
  );
}
