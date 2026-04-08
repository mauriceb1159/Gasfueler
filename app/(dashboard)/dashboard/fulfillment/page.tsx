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

      <div className="space-y-6">
        {requests.length > 0 ? (
          requests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <CardTitle className="flex flex-col gap-2 text-base sm:flex-row sm:items-center sm:justify-between">
                  <span className="flex items-center gap-2">
                    <Fuel className="h-5 w-5 text-orange-600" />
                    Request #{request.id}
                  </span>
                  <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
                    {request.status.replace('_', ' ')}
                  </span>
                </CardTitle>
              </CardHeader>
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
                </div>

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
                ) : (
                  <div className="mt-5 rounded-2xl border border-orange-100 bg-orange-50/80 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                        <Camera className="h-4 w-4 text-orange-600" />
                        Attendant completion
                      </div>
                      {request.status !== FuelRequestStatus.CANCELED ? (
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
                    <FulfillmentProofForm requestId={request.id} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No fuel requests are ready for fulfillment yet.
            </CardContent>
          </Card>
        )}
      </div>
    </section>
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
