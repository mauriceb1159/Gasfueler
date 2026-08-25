import { asc, eq } from 'drizzle-orm';

import { canManageStoreCatalog } from '@/lib/auth/roles';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { activityLogs, teamMembers } from '@/lib/db/schema';

function escapeCsvValue(value: string | null | undefined) {
  const normalized = value ?? '';

  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  return normalized;
}

async function recordExportActivity(userId: number, action: string) {
  const membership = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, userId),
    columns: {
      teamId: true
    }
  });

  if (!membership) {
    return;
  }

  await db.insert(activityLogs).values({
    teamId: membership.teamId,
    userId,
    action
  });
}

export async function GET() {
  const user = await getUser();

  if (!user) {
    return Response.json({ error: 'User is not authenticated.' }, { status: 401 });
  }

  if (!canManageStoreCatalog(user.role)) {
    return Response.json(
      { error: 'Only store admins can export station assignments.' },
      { status: 403 }
    );
  }

  const assignments = await db.query.stationStoreItems.findMany({
    columns: {
      priceCents: true,
      inventoryCount: true,
      active: true
    },
    with: {
      station: {
        columns: {
          name: true
        }
      },
      storeItem: {
        columns: {
          slug: true
        }
      }
    },
    orderBy: (stationStoreItems, { asc }) => [asc(stationStoreItems.stationId), asc(stationStoreItems.storeItemId)]
  });

  const rows = [
    ['station', 'productSlug', 'price', 'inventory', 'active'].join(','),
    ...assignments.map((assignment) =>
      [
        escapeCsvValue(assignment.station.name),
        escapeCsvValue(assignment.storeItem.slug),
        escapeCsvValue((assignment.priceCents / 100).toFixed(2)),
        escapeCsvValue(
          assignment.inventoryCount === null ? '' : String(assignment.inventoryCount)
        ),
        escapeCsvValue(assignment.active ? 'true' : 'false')
      ].join(',')
    )
  ];

  await recordExportActivity(
    user.id,
    'STORE_EXPORT_STATION_ASSIGNMENTS Exported current station assignments.'
  );

  return new Response(rows.join('\n'), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="station-assignment-export.csv"'
    }
  });
}
