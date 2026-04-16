import { redirect } from 'next/navigation';
import { Camera, CheckCircle2, Fuel } from 'lucide-react';

import { FulfillmentProofForm } from './fulfillment-form';
import { cancelFuelRequest } from '@/app/(dashboard)/requests/actions';
import { Button } from '@/components/ui/button';
import {
  getFuelRequestsForFulfillment,
  getUser
} from '@/lib/db/queries';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { FuelRequestStatus } from '@/lib/db/schema';

export default async function FulfillmentPage() {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  const requests = await getFuelRequestsForFulfillment();
  const activeRequests = requests.filter(
    (request) =>
      request.status !== FuelRequestStatus.COMPLETED &&
      request.status !== FuelRequestStatus.CANCELED
  );
  const completedRequests = requests.filter(
    (request) => request.status === FuelRequestStatus.COMPLETED
  );
  const canceledRequests = requests.filter(
    (request) => request.status === FuelRequestStatus.CANCELED
  );

  return (
    <section className="flex-1 p-4 lg:p-8">
      <div className="mb-6 max-w-3xl">
        <h1 className="text-lg font-medium text-gray-900 lg:text-2xl">
          Fulfillment Proof
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Complete a fuel request by entering the actual pump numbers and
          uploading the pump screen plus gas cap door secured photos.
        </p>
      </div>

      <div className="space-y-8">
        <RequestSection
          title="Active Requests"
          description="Requests that still need attention, fueling, or final proof."
          requests={activeRequests}
          emptyMessage="No active fuel requests right now."
        />

        <RequestSection
          title="Completed Requests"
          description="Recently completed fuel stops with proof stored in Supabase Storage."
          requests={completedRequests}
          emptyMessage="No completed fuel requests yet."
        />

        <RequestSection
          title="Canceled Requests"
          description="Canceled requests are kept here as operational history."
          requests={canceledRequests}
          emptyMessage="No canceled requests."
          subdued
        />
      </div>
    </section>
  );
}

function RequestSection({
  title,
  description,
  requests,
  emptyMessage,
  subdued = false
}: {
  title: string;
  description: string;
  requests: Awaited<ReturnType<typeof getFuelRequestsForFulfillment>>;
  emptyMessage: string;
  subdued?: boolean;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2
          className={`text-base font-semibold lg:text-xl ${
            subdued ? 'text-slate-700' : 'text-slate-950'
          }`}
        >
          {title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>

      {requests.length > 0 ? (
        requests.map((request) => <RequestCard key={request.id} request={request} />)
      ) : (
        <Card className={subdued ? 'border-dashed border-slate-200 bg-slate-50/70' : ''}>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {emptyMessage}
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function RequestCard({
  request
}: {
  request: Awaited<ReturnType<typeof getFuelRequestsForFulfillment>>[number];
}) {
  const isActiveRequest =
    request.status !== FuelRequestStatus.COMPLETED &&
    request.status !== FuelRequestStatus.CANCELED;

  return (
    <Card>
      <details className="group" open={isActiveRequest}>
        <summary className="list-none cursor-pointer">
          <CardHeader>
            <CardTitle className="flex flex-col gap-3 text-base sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Fuel className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-left font-semibold text-slate-950">
                    Request #{request.id}
                  </p>
                  <p className="mt-1 text-sm font-normal text-slate-500">
                    {request.user.name || request.user.email} at {request.station.name}
                  </p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                    Submitted {formatRelativeTimestamp(request.createdAt)} ·{' '}
                    {formatTimestamp(request.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
                  {request.status.replace('_', ' ')}
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 group-open:hidden">
                  View details
                </span>
                <span className="hidden text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 group-open:inline">
                  Hide details
                </span>
              </div>
            </CardTitle>
          </CardHeader>
        </summary>
        <CardContent>
          <div className="grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
            <InfoRow label="Customer" value={request.user.name || request.user.email} />
            <InfoRow
              label="Station"
              value={`${request.station.name} - ${request.station.city}, ${request.station.state}`}
            />
            <InfoRow
              label="Vehicle"
              value={`${request.vehicle.nickname || request.vehicle.licensePlate} (${request.vehicle.licensePlate})`}
            />
            <InfoRow label="Fuel grade" value={formatFuelGrade(request.fuelGrade)} />
            <InfoRow label="Requested type" value={formatFuelGrade(request.requestType)} />
            <InfoRow label="Service fee" value={formatCurrency(request.serviceFee)} />
            <InfoRow
              label="Submitted"
              value={`${formatRelativeTimestamp(request.createdAt)} · ${formatTimestamp(
                request.createdAt
              )}`}
            />
            <InfoRow
              label={request.completedAt ? 'Completed' : 'Last updated'}
              value={`${formatRelativeTimestamp(
                request.completedAt ?? request.updatedAt
              )} · ${formatTimestamp(request.completedAt ?? request.updatedAt)}`}
            />
          </div>

          {request.status !== FuelRequestStatus.CANCELED &&
          request.status !== FuelRequestStatus.COMPLETED ? (
            <form action={cancelFuelRequest} className="mt-5">
              <input type="hidden" name="requestId" value={request.id} />
              <Button
                type="submit"
                variant="outline"
                className="rounded-full border-red-200 bg-white text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                Delete pending request
              </Button>
            </form>
          ) : null}

          {request.completedAt ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                Completed with proof
              </div>
              <p className="mt-2">
                Pump photo and gas cap secured photo are stored in Supabase
                Storage for this request.
              </p>
            </div>
          ) : request.status === FuelRequestStatus.CANCELED ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              This request was canceled and moved out of the active queue.
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-orange-100 bg-orange-50/80 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Camera className="h-4 w-4 text-orange-600" />
                Attendant completion
              </div>
              <FulfillmentProofForm requestId={request.id} />
            </div>
          )}
        </CardContent>
      </details>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-medium text-slate-950">{value}</p>
    </div>
  );
}

function formatFuelGrade(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100);
}

function formatTimestamp(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function formatRelativeTimestamp(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (1000 * 60));

  if (Math.abs(diffMinutes) < 1) {
    return 'just now';
  }

  if (Math.abs(diffMinutes) < 60) {
    return new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' }).format(
      diffMinutes,
      'minute'
    );
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (Math.abs(diffHours) < 24) {
    return new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' }).format(
      diffHours,
      'hour'
    );
  }

  const diffDays = Math.round(diffHours / 24);

  return new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' }).format(
    diffDays,
    'day'
  );
}
