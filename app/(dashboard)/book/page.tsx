import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Clock3, Fuel, ShieldCheck } from 'lucide-react';

import { BookingForm, EmptyBookingState } from './booking-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getBookableStations, getUser, getVehiclesForUser } from '@/lib/db/queries';

export default async function BookPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in?redirect=book');
  }

  const params = searchParams ? await searchParams : undefined;

  const [stations, vehicles] = await Promise.all([
    getBookableStations(),
    getVehiclesForUser(user.id)
  ]);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#ffffff_60%)] px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-700 shadow-sm sm:px-4 sm:text-xs sm:tracking-[0.28em]">
            <Fuel className="h-3.5 w-3.5" />
            Book Fueling
          </span>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:mt-6 sm:text-5xl">
            Reserve a GasFueler stop in minutes.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Pick a partner station, choose a service window, and save the
            details your attendant needs before you arrive.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-[1.5rem] border-orange-100 shadow-[0_25px_70px_-40px_rgba(15,23,42,0.32)] sm:rounded-[2rem]">
            <CardHeader>
              <CardTitle className="text-2xl text-slate-950 sm:text-3xl">
                Fuel Request
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stations.length === 0 ? (
                <EmptyBookingState />
              ) : (
                <BookingForm
                  stations={stations}
                  vehicles={vehicles}
                  initialError={params?.error}
                />
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="rounded-[1.5rem] border-slate-200 bg-slate-950 text-white shadow-[0_28px_80px_-36px_rgba(15,23,42,0.8)] sm:rounded-[2rem]">
              <CardHeader>
                <CardTitle className="text-xl sm:text-2xl">How this MVP works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-7 text-slate-300">
                <p>
                  This first booking flow is intentionally slot-based. Customers
                  choose from actual station capacity instead of requesting
                  vague ASAP fulfillment.
                </p>
                <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4 sm:rounded-[1.5rem] sm:p-5">
                  <div className="flex items-center gap-3">
                    <Clock3 className="h-5 w-5 text-orange-300" />
                    <p className="font-semibold text-white">Simple operating rule</p>
                  </div>
                  <p className="mt-3">
                    One slot, one attendant-capacity check, one saved request.
                    That keeps the first pilot realistic for operators.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.5rem] border-orange-100 sm:rounded-[2rem]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl text-slate-950 sm:text-2xl">
                  <ShieldCheck className="h-5 w-5 text-orange-600" />
                  Next build step
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-slate-600">
                <p>
                  After this form, the natural next step is an attendant
                  dashboard that shows upcoming requests by station and status.
                </p>
                <Button asChild variant="outline" className="w-full rounded-full sm:w-auto">
                  <Link href="/dashboard">Return to dashboard</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
