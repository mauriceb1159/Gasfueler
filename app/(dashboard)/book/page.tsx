import { redirect } from 'next/navigation';
import { Fuel } from 'lucide-react';

import { BookingForm, EmptyBookingState } from './booking-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getDashboardUrlForRole, USER_ROLES, type UserRole } from '@/lib/auth/roles';
import { getBookableStations, getUser, getVehiclesForUser } from '@/lib/db/queries';

export default async function BookPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string; success?: string }>;
}) {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in?redirect=book');
  }

  if (user.role !== USER_ROLES.END_USER) {
    redirect(getDashboardUrlForRole(user.role as UserRole));
  }

  const params = searchParams ? await searchParams : undefined;
  let stations = [] as Awaited<ReturnType<typeof getBookableStations>>;
  let vehicles = [] as Awaited<ReturnType<typeof getVehiclesForUser>>;
  let loadError: string | undefined;

  try {
    [stations, vehicles] = await Promise.all([
      getBookableStations(),
      getVehiclesForUser(user.id)
    ]);
  } catch (error) {
    console.error('Failed to load booking page data:', error);
    loadError =
      'Booking is temporarily unavailable while station scheduling data is being set up. Please try again shortly.';
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#ffffff_60%)] px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-700 shadow-sm sm:px-4 sm:text-xs sm:tracking-[0.28em]">
            <Fuel className="h-3.5 w-3.5" />
            Book Fueling
          </span>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:mt-6 sm:text-5xl">
            Choose fuel, snacks, or both in one polished stop.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Start with fuel only, build a bigger convenience order, or shop the
            market first. The flow adjusts so customers can get in and out with
            less friction.
          </p>
        </div>

        <div className="mt-10">
          <Card className="rounded-[1.5rem] border-orange-100 shadow-[0_25px_70px_-40px_rgba(15,23,42,0.32)] sm:rounded-[2rem]">
            <CardHeader>
              <CardTitle className="text-2xl text-slate-950 sm:text-3xl">
                Plan your stop
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadError ? (
                <EmptyBookingState
                  title="Booking is temporarily unavailable"
                  description={loadError}
                  footnote="If this is a fresh deploy, make sure the booking tables and seed data have been applied in the production database."
                />
              ) : stations.length === 0 ? (
                <EmptyBookingState />
              ) : (
                <BookingForm
                  stations={stations}
                  vehicles={vehicles}
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
