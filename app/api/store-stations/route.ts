import { getUser, getStoreStations } from '@/lib/db/queries';

export async function GET() {
  const user = await getUser();

  if (!user) {
    return Response.json({ error: 'User is not authenticated.' }, { status: 401 });
  }

  const stations = await getStoreStations();
  return Response.json(stations);
}
