import { asc, eq } from 'drizzle-orm';

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

  if (user.role !== 'owner') {
    return Response.json({ error: 'Only owners can export the store catalog.' }, { status: 403 });
  }

  const products = await db.query.storeItems.findMany({
    columns: {
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      basePriceCents: true,
      active: true
    },
    with: {
      category: {
        columns: {
          name: true
        }
      }
    },
    orderBy: (storeItems, { asc }) => [asc(storeItems.name)]
  });

  const rows = [
    ['name', 'slug', 'category', 'basePrice', 'description', 'imageUrl', 'active'].join(','),
    ...products.map((product) =>
      [
        escapeCsvValue(product.name),
        escapeCsvValue(product.slug),
        escapeCsvValue(product.category?.name ?? ''),
        escapeCsvValue((product.basePriceCents / 100).toFixed(2)),
        escapeCsvValue(product.description),
        escapeCsvValue(product.imageUrl),
        escapeCsvValue(product.active ? 'true' : 'false')
      ].join(',')
    )
  ];

  await recordExportActivity(user.id, 'STORE_EXPORT_PRODUCTS Exported current product catalog.');

  return new Response(rows.join('\n'), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="store-catalog-export.csv"'
    }
  });
}
