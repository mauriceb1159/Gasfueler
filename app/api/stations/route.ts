import { getStationsForPricing } from '@/lib/db/queries';

export async function GET() {
  const stations = await getStationsForPricing();
  return Response.json(stations);
}
