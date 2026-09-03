import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  ArrowRight,
  CalendarClock,
  Camera,
  CheckCircle2,
  CreditCard,
  Fuel,
  MapPinned
} from 'lucide-react';

import { FulfillmentProofForm } from '@/app/(dashboard)/dashboard/fulfillment/fulfillment-form';
import { cancelFuelRequest } from '@/app/(dashboard)/requests/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { canManageFulfillment } from '@/lib/auth/roles';
import { getFuelRequestById, getUser } from '@/lib/db/queries';
import { FuelRequestStatus } from '@/lib/db/schema';

export default async function RequestDetailsPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ payment?: string }>;
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

  if (!request) {
    notFound();
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const canManageRequestFulfillment = canManageFulfillment(user.role);
  const isRequestOwner = request.userId === user.id;
  const needsPayment = request.status === FuelRequestStatus.PENDING_PAYMENT;
  const canCancelRequest =
    request.status !== FuelRequestStatus.COMPLETED &&
    request.status !== FuelRequestStatus.CANCELED &&
    (canManageRequestFulfillment || isRequestOwner);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#ffffff_60%)] px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-700 shadow-sm sm:px-4 sm:text-xs sm:tracking-[0.28em]">
            <Fuel className="h-3.5 w-3.5" />
            Request Details
          </span>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:mt-6 sm:text-5xl">
            Fuel request #{request.id}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Track the request status, review the estimate, and complete fueling
            proof from one place.
          </p>
        </div>

        {resolvedSearchParams.payment === 'demo-paid' ? (
          <div className="mt-8 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800 shadow-sm">
            <p className="font-semibold">Demo payment authorized</p>
            <p className="mt-1">
              This request is scheduled and ready for the fulfillment workflow.
            </p>
          </div>
        ) : null}

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <Card className="rounded-[1.5rem] border-orange-100 shadow-[0_25px_70px_-40px_rgba(15,23,42,0.32)] sm:rounded-[2rem]">
              <CardHeader>
                <CardTitle className="flex flex-col gap-3 text-2xl text-slate-950 sm:flex-row sm:items-center sm:justify-between sm:text-3xl">
                  <span>Booking Summary</span>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize tracking-wide text-slate-700">
                      {request.status.replace('_', ' ')}
                    </span>
                    {canCancelRequest ? (
                      <form action={cancelFuelRequest}>
                        <input type="hidden" name="requestId" value={request.id} />
                        <Button
                          type="submit"
                          variant="outline"
                          className="rounded-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          Delete pending request
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <InfoCard
                    icon={MapPinned}
                    label="Station"
                    value={`${request.station.name} - ${request.station.city}, ${request.station.state}`}
                  />
                  <InfoCard
                    icon={CalendarClock}
                    label="Time slot"
                    value={formatSlot(request.slot.startAt, request.slot.endAt)}
                  />
                  <InfoCard
                    icon={Fuel}
                    label="Fuel"
                    value={`${formatValue(request.fuelGrade)} (${formatValue(request.requestType)})`}
                  />
                  <InfoCard
                    icon={CreditCard}
                    label="Vehicle"
                    value={`${request.vehicle.nickname || request.vehicle.licensePlate} (${request.vehicle.licensePlate})`}
                  />
                </div>

                <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 sm:p-5">
                  <p className="text-sm font-semibold text-slate-950">
                    Special instructions
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {request.specialInstructions || 'No special instructions provided.'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.5rem] border-orange-100 sm:rounded-[2rem]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl text-slate-950 sm:text-2xl">
                  <CheckCircle2 className="h-5 w-5 text-orange-600" />
                  Status Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {request.statusEvents.length > 0 ? (
                  request.statusEvents.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-semibold text-slate-950">
                          {formatValue(event.status)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDateTime(event.createdAt)}
                        </p>
                      </div>
                      {event.note ? (
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {event.note}
                        </p>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    No request events have been recorded yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {needsPayment && isRequestOwner ? (
              <Card className="rounded-[1.5rem] border-orange-200 bg-white shadow-[0_25px_70px_-40px_rgba(15,23,42,0.32)] sm:rounded-[2rem]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl text-slate-950 sm:text-2xl">
                    <CreditCard className="h-5 w-5 text-orange-600" />
                    Payment Required
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-6 text-slate-600">
                    Complete the demo checkout to move this booking into the
                    scheduled workflow. No real card is charged.
                  </p>
                  <Button
                    asChild
                    className="h-11 w-full rounded-full bg-orange-600 text-white shadow-lg shadow-orange-200 hover:bg-orange-700"
                  >
                    <Link href={`/requests/${request.id}/demo-payment`}>
                      Continue to demo payment
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            <Card className="rounded-[1.5rem] border-orange-200 bg-orange-50 shadow-[0_25px_70px_-40px_rgba(15,23,42,0.32)] sm:rounded-[2rem]">
              <CardHeader>
                <CardTitle className="text-xl text-slate-950 sm:text-2xl">
                  Pricing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-700">
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
                <div className="border-t border-orange-200 pt-3">
                  <SummaryRow
                    label="Estimated total"
                    value={formatCurrency(request.totalEstimate)}
                    strong
                  />
                </div>
                {request.completedAt ? (
                  <div className="mt-4 rounded-2xl border border-white/70 bg-white/80 p-4">
                    <SummaryRow
                      label="Actual gallons"
                      value={formatGallons(request.actualGallons)}
                    />
                    <SummaryRow
                      label="Actual price / gallon"
                      value={formatCurrency(request.actualPricePerGallon)}
                    />
                    <SummaryRow
                      label="Actual fuel total"
                      value={formatCurrency(request.actualFuelTotal)}
                    />
                    <SummaryRow
                      label="Completed at"
                      value={request.completedAt ? formatDateTime(request.completedAt) : 'TBD'}
                    />
                  </div>
                ) : null}
                {request.order?.orderItems.length ? (
                  <div className="mt-4 rounded-2xl border border-white/70 bg-white/80 p-4">
                    <p className="text-sm font-semibold text-slate-950">
                      Store items
                    </p>
                    <div className="mt-3 space-y-2">
                      {request.order.orderItems.map((item) => (
                        <SummaryRow
                          key={item.id}
                          label={`${item.itemName} x${item.quantity}`}
                          value={formatCurrency(item.subtotalPrice)}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="rounded-[1.5rem] border-orange-100 sm:rounded-[2rem]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl text-slate-950 sm:text-2xl">
                  <Camera className="h-5 w-5 text-orange-600" />
                  Fulfillment
                </CardTitle>
              </CardHeader>
              <CardContent>
                {request.completedAt ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    <p className="font-semibold">Completed with proof</p>
                    <p className="mt-2">
                      Pump screen and gas cap secured photos have been saved for
                      this request.
                    </p>
                  </div>
                ) : canManageRequestFulfillment ? (
                  <div className="space-y-3">
                    <p className="text-sm leading-6 text-slate-600">
                      Complete the fueling stop here instead of navigating to a
                      separate back-office page.
                    </p>
                    <FulfillmentProofForm requestId={request.id} />
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-slate-600">
                    {needsPayment
                      ? 'Complete payment to schedule this request for fueling.'
                      : 'Your request is scheduled. An attendant will complete fueling and upload proof once service is done.'}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Fuel;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-3 text-sm font-medium leading-6 text-slate-950">{value}</p>
    </div>
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

function formatGallons(value: number | null) {
  if (value === null) {
    return 'TBD';
  }

  return (value / 1000).toFixed(3);
}

function formatDateTime(value: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

function formatSlot(startAt: string | Date, endAt: string | Date) {
  return `${formatDateTime(startAt)} - ${new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(endAt))}`;
}

function formatValue(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
