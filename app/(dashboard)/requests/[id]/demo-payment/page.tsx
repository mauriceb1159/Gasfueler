import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  ArrowLeft,
  BadgeCheck,
  CreditCard,
  Fuel,
  LockKeyhole,
  MapPinned
} from 'lucide-react';

import { completeDemoFuelPayment } from '@/app/(dashboard)/requests/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getFuelRequestById, getUser } from '@/lib/db/queries';
import { FuelRequestStatus } from '@/lib/db/schema';

export default async function DemoFuelPaymentPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
}) {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  const { id } = await params;
  const requestId = Number(id);

  if (!Number.isInteger(requestId) || requestId <= 0) {
    notFound();
  }

  const request = await getFuelRequestById(requestId);

  if (!request || request.userId !== user.id) {
    notFound();
  }

  if (request.status !== FuelRequestStatus.PENDING_PAYMENT) {
    redirect(`/requests/${request.id}`);
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const defaultName = user.name || user.email.split('@')[0] || 'GasBite Tester';

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#ffffff_62%)] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Button asChild variant="ghost" className="mb-6 rounded-full text-slate-700">
          <Link href={`/requests/${request.id}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to request
          </Link>
        </Button>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="space-y-6">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-orange-700 shadow-sm">
                <LockKeyhole className="h-3.5 w-3.5" />
                Demo Checkout
              </span>
              <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Authorize payment for request #{request.id}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                Use the placeholder card to test the full booking workflow. No
                real payment is collected or sent to Stripe.
              </p>
            </div>

            <Card className="rounded-[1.5rem] border-orange-100 bg-white/90 shadow-[0_25px_70px_-40px_rgba(15,23,42,0.32)] sm:rounded-[2rem]">
              <CardHeader>
                <CardTitle className="text-xl text-slate-950 sm:text-2xl">
                  Booking Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-700">
                <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <MapPinned className="mt-1 h-5 w-5 text-orange-600" />
                  <div>
                    <p className="font-semibold text-slate-950">
                      {request.station.name}
                    </p>
                    <p className="mt-1 text-slate-600">
                      {request.station.city}, {request.station.state}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <Fuel className="mt-1 h-5 w-5 text-orange-600" />
                  <div>
                    <p className="font-semibold text-slate-950">
                      {formatValue(request.fuelGrade)}
                    </p>
                    <p className="mt-1 text-slate-600">
                      {request.vehicle.nickname || request.vehicle.licensePlate} -{' '}
                      {request.vehicle.licensePlate}
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                  <SummaryRow
                    label="Estimated fuel"
                    value={formatCurrency(request.fuelEstimate)}
                  />
                  <SummaryRow
                    label="Service fee"
                    value={formatCurrency(request.serviceFee)}
                  />
                  <SummaryRow
                    label="Add-ons"
                    value={formatCurrency(request.addonTotal)}
                  />
                  <div className="mt-3 border-t border-orange-200 pt-3">
                    <SummaryRow
                      label="Estimated total"
                      value={formatCurrency(request.totalEstimate)}
                      strong
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <Card className="rounded-[1.5rem] border-orange-100 bg-white shadow-[0_25px_70px_-40px_rgba(15,23,42,0.35)] sm:rounded-[2rem]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-slate-950 sm:text-2xl">
                <CreditCard className="h-5 w-5 text-orange-600" />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {resolvedSearchParams.error === 'missing-details' ? (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  Please keep the demo card details filled in before authorizing.
                </div>
              ) : null}

              <form action={completeDemoFuelPayment} className="space-y-5">
                <input type="hidden" name="requestId" value={request.id} />

                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">
                    Name on card
                  </span>
                  <input
                    name="cardholderName"
                    defaultValue={defaultName}
                    className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    autoComplete="cc-name"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">
                    Card number
                  </span>
                  <input
                    name="cardNumber"
                    defaultValue="4242 4242 4242 4242"
                    inputMode="numeric"
                    className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    autoComplete="cc-number"
                    required
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">
                      Expiration
                    </span>
                    <input
                      name="expiry"
                      defaultValue="12/34"
                      inputMode="numeric"
                      className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      autoComplete="cc-exp"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">
                      CVC
                    </span>
                    <input
                      name="cvc"
                      defaultValue="123"
                      inputMode="numeric"
                      className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      autoComplete="cc-csc"
                      required
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">
                    ZIP code
                  </span>
                  <input
                    name="zipCode"
                    defaultValue="95682"
                    inputMode="numeric"
                    className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    autoComplete="postal-code"
                    required
                  />
                </label>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
                  <p className="flex items-center gap-2 font-semibold">
                    <BadgeCheck className="h-4 w-4" />
                    Demo mode
                  </p>
                  <p className="mt-1">
                    This authorizes a test payment inside GasBite only. It does
                    not create a Stripe charge or save a real card.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="h-12 w-full rounded-full bg-orange-600 text-base font-semibold text-white shadow-lg shadow-orange-200 hover:bg-orange-700"
                >
                  Authorize demo payment
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

function SummaryRow({
  label,
  value,
  strong = false
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={strong ? 'font-semibold text-slate-950' : 'text-slate-600'}>
        {label}
      </span>
      <span className={strong ? 'font-semibold text-slate-950' : 'font-medium text-slate-950'}>
        {value}
      </span>
    </div>
  );
}

function formatCurrency(cents: number | null) {
  if (cents === null) {
    return 'TBD';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100);
}

function formatValue(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
