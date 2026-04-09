import { redirect } from 'next/navigation';
import { ShoppingBag } from 'lucide-react';

import { EmptyMarketState, MarketForm } from './market-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getStoreOrdersForUser,
  getStoreStations,
  getUser,
} from '@/lib/db/queries';

export default async function MarketPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; success?: string }>;
}) {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in?redirect=market');
  }

  const params = searchParams ? await searchParams : undefined;

  const [stations, recentOrders] = await Promise.all([
    getStoreStations(),
    getStoreOrdersForUser(user.id),
  ]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.14),_transparent_30%),linear-gradient(180deg,#fff8f1_0%,#ffffff_60%)] px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-700 shadow-sm sm:px-4 sm:text-xs sm:tracking-[0.28em]">
              <ShoppingBag className="h-3.5 w-3.5" />
              Station Market
            </span>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:mt-6 sm:text-5xl">
              Order snacks, drinks, and essentials for pickup in minutes.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              Browse the station like a real storefront, build your cart fast, and
              choose exactly how pickup should work before you head over.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-orange-100 bg-white/90 p-5 shadow-[0_25px_70px_-45px_rgba(15,23,42,0.4)]">
            <ShoppingBag className="h-3.5 w-3.5" />
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700">
              Why this flow works
            </p>
            <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
              <p>Shop the store without starting a fuel booking.</p>
              <p>Browse by collection, search fast, and build a cart right away.</p>
              <p>Pick up ASAP, schedule ahead, or have prep start on arrival.</p>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <Card className="rounded-[1.5rem] border-orange-100 shadow-[0_25px_70px_-40px_rgba(15,23,42,0.32)] sm:rounded-[2rem]">
            <CardHeader>
              <CardTitle className="text-2xl text-slate-950 sm:text-3xl">
                Market order
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stations.length === 0 ? (
                <EmptyMarketState />
              ) : (
                <MarketForm
                  stations={stations}
                  recentOrders={recentOrders}
                  initialError={params?.error}
                  successOrderId={params?.success}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
