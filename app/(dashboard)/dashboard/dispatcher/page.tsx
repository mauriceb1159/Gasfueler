import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Clock, Navigation, Route, Truck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  assignDispatchJob,
  listDispatchJobs,
  listDrivers,
} from '@/lib/dispatch-service';
import { canManageDispatch } from '@/lib/auth/roles';
import { getUser } from '@/lib/db/queries';
import { DispatchJobStatus } from '@/lib/db/schema';

export const metadata = {
  title: 'Dispatch',
};

async function assignDriverAction(formData: FormData) {
  'use server';

  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!canManageDispatch(user.role)) {
    throw new Error('Only dispatchers and admins can assign dispatch jobs.');
  }

  const jobId = Number(formData.get('jobId'));
  const driverId = Number(formData.get('driverId'));

  if (!Number.isInteger(jobId) || jobId <= 0) {
    throw new Error('Invalid dispatch job id.');
  }

  if (!Number.isInteger(driverId) || driverId <= 0) {
    throw new Error('Choose a driver before assigning this job.');
  }

  const result = await assignDispatchJob(jobId, { driverId }, user);

  if ('error' in result) {
    throw new Error(result.error);
  }

  revalidatePath('/dashboard/dispatcher');
}

export default async function DispatcherDashboard() {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!canManageDispatch(user.role)) {
    redirect('/dashboard');
  }

  const [jobs, drivers] = await Promise.all([
    listDispatchJobs(),
    listDrivers(),
  ]);

  const activeJobs = jobs.filter((job) =>
    [
      DispatchJobStatus.ASSIGNED,
      DispatchJobStatus.ACCEPTED,
      DispatchJobStatus.EN_ROUTE,
      DispatchJobStatus.ARRIVED,
      DispatchJobStatus.SERVICING,
    ].includes(job.status as DispatchJobStatus)
  );
  const unassignedJobs = jobs.filter(
    (job) => job.status === DispatchJobStatus.UNASSIGNED
  );
  const completedJobs = jobs.filter((job) =>
    [DispatchJobStatus.COMPLETED, DispatchJobStatus.CANCELED].includes(
      job.status as DispatchJobStatus
    )
  );
  const availableDrivers = drivers.filter(
    (driver) => driver.active && driver.availabilityStatus === 'available'
  );

  return (
    <section className="flex-1 p-4 lg:p-8">
      <div className="mb-6 max-w-3xl">
        <h1 className="text-lg font-medium text-gray-900 lg:text-2xl">
          Dispatch Board
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Auto-created jobs from fuel bookings and store orders appear here so
          dispatchers can assign drivers without changing the customer flow.
        </p>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <MetricCard
          icon={<Navigation className="h-5 w-5 text-orange-600" />}
          label="Unassigned"
          value={unassignedJobs.length}
        />
        <MetricCard
          icon={<Route className="h-5 w-5 text-blue-600" />}
          label="Active Jobs"
          value={activeJobs.length}
        />
        <MetricCard
          icon={<Truck className="h-5 w-5 text-green-600" />}
          label="Available Drivers"
          value={availableDrivers.length}
        />
        <MetricCard
          icon={<Clock className="h-5 w-5 text-slate-600" />}
          label="Completed"
          value={completedJobs.length}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Dispatch Jobs
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Assign a driver to jobs that are waiting in the queue.
            </p>
          </div>

          {jobs.length === 0 ? (
            <EmptyCard message="No dispatch jobs yet. New bookings and store orders will appear here automatically." />
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => {
                const currentAssignment = job.assignments.find(
                  (assignment) => assignment.assignmentStatus === 'assigned'
                );

                return (
                  <article
                    key={job.id}
                    className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-orange-700">
                            {job.jobType}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {job.status}
                          </span>
                        </div>
                        <h3 className="mt-3 text-base font-semibold text-slate-950">
                          Job #{job.id} at {job.station?.name ?? 'Station'}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          Customer:{' '}
                          {job.customerUser?.name || job.customerUser?.email}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {job.station
                            ? `${job.station.city}, ${job.station.state}`
                            : 'Station details pending'}
                        </p>
                        {currentAssignment?.driver?.user ? (
                          <p className="mt-2 text-sm font-medium text-green-700">
                            Assigned to{' '}
                            {currentAssignment.driver.user.name ||
                              currentAssignment.driver.user.email}
                          </p>
                        ) : null}
                      </div>

                      <form
                        action={assignDriverAction}
                        className="flex min-w-[240px] flex-col gap-2"
                      >
                        <input type="hidden" name="jobId" value={job.id} />
                        <select
                          name="driverId"
                          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                          defaultValue=""
                        >
                          <option value="" disabled>
                            Choose driver
                          </option>
                          {drivers.map((driver) => (
                            <option key={driver.id} value={driver.id}>
                              {driver.user?.name || driver.user?.email} (
                              {driver.availabilityStatus})
                            </option>
                          ))}
                        </select>
                        <Button type="submit" className="rounded-xl">
                          Assign driver
                        </Button>
                      </form>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Drivers</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Driver profiles are managed through the dispatch API.
            </p>
          </div>

          {drivers.length === 0 ? (
            <EmptyCard message="No driver profiles yet. Use POST /api/dispatch/drivers to create one." />
          ) : (
            <div className="space-y-3">
              {drivers.map((driver) => (
                <div
                  key={driver.id}
                  className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <p className="font-semibold text-slate-950">
                    {driver.user?.name || driver.user?.email}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {driver.user?.email}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {driver.availabilityStatus}
                    </span>
                    {driver.currentStation ? (
                      <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                        {driver.currentStation.name}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50">
        {icon}
      </div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function EmptyCard({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white/80 p-8 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}
