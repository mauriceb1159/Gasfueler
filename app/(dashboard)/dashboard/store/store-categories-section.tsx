import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db/drizzle';
import { toggleStoreCategory } from './actions';

export async function StoreCategoriesSection() {
  const categories = await db.query.storeCategories.findMany({
    columns: {
      id: true,
      name: true,
      slug: true,
      active: true,
      sortOrder: true
    },
    with: {
      storeItems: {
        columns: {
          id: true
        }
      }
    },
    orderBy: (storeCategories, { asc }) => [
      asc(storeCategories.sortOrder),
      asc(storeCategories.name)
    ]
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {categories.map((category) => (
        <Card key={category.id}>
          <CardContent className="flex items-center justify-between gap-4 p-5">
            <div>
              <p className="font-semibold text-slate-950">{category.name}</p>
              <p className="mt-1 text-sm text-slate-500">
                {category.slug} • {category.storeItems.length} item
                {category.storeItems.length === 1 ? '' : 's'}
              </p>
            </div>
            <form action={toggleStoreCategory}>
              <input type="hidden" name="categoryId" value={category.id} />
              <input type="hidden" name="active" value={String(!category.active)} />
              <Button type="submit" variant="outline" className="rounded-full">
                {category.active ? 'Deactivate' : 'Activate'}
              </Button>
            </form>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
