import { getUser, getStationsForServiceSlotManagement } from '@/lib/db/queries';

export async function GET() {
  const user = await getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stations = await getStationsForServiceSlotManagement();
  return Response.json(stations);
}
