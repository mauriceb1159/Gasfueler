import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Clock, DollarSign, MapPin, Truck } from 'lucide-react';

import { USER_ROLES } from '@/lib/auth/roles';
import { getUser } from '@/lib/db/queries';
import { listAssignedDispatchJobsForDriver } from '@/lib/dispatch-service';

export const metadata: Metadata = {
  title: 'Driver Dashboard'
};

export default async function DriverDashboard() {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in?redirect=dashboard/driver');
  }

  if (user.role !== USER_ROLES.FUEL_DRIVER) {
    redirect('/dashboard');
  }

  const assignedJobsResult = await listAssignedDispatchJobsForDriver(user);
  const assignedJobs = Array.isArray(assignedJobsResult) ? assignedJobsResult : [];
  const activeJobs = assignedJobs.filter(
    (job) => !['completed', 'canceled'].includes(job.status)
  );
  const completedToday = assignedJobs.filter((job) => job.status === 'completed').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Driver Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-white p-6">
          <Truck className="h-6 w-6 text-orange-600 mb-2" />
          <div className="text-sm font-medium text-gray-500">Active Deliveries</div>
          <div className="text-3xl font-bold">{activeJobs.length}</div>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <MapPin className="h-6 w-6 text-blue-600 mb-2" />
          <div className="text-sm font-medium text-gray-500">Completed Today</div>
          <div className="text-3xl font-bold">{completedToday}</div>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <Clock className="h-6 w-6 text-green-600 mb-2" />
          <div className="text-sm font-medium text-gray-500">Hours Worked</div>
          <div className="text-3xl font-bold">0</div>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <DollarSign className="h-6 w-6 text-purple-600 mb-2" />
          <div className="text-sm font-medium text-gray-500">Earnings Today</div>
          <div className="text-3xl font-bold">$0.00</div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <h2 className="text-xl font-semibold mb-4">Today's Routes</h2>
        {assignedJobsResult && !Array.isArray(assignedJobsResult) && 'error' in assignedJobsResult ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {assignedJobsResult.error}
          </div>
        ) : activeJobs.length === 0 ? (
          <div className="text-gray-500 py-8 text-center">
            <p>No active routes. Check back for new delivery assignments.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeJobs.map((job) => {
              const assignment = job.assignments.find((item) =>
                ['assigned', 'accepted'].includes(item.assignmentStatus)
              );

              return (
                <div
                  key={job.id}
                  className="rounded-xl border border-orange-100 bg-orange-50/40 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">
                          {job.jobType}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {job.status.replaceAll('_', ' ')}
                        </span>
                        {assignment ? (
                          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                            {assignment.assignmentStatus}
                          </span>
                        ) : null}
                      </div>
                      <h3 className="mt-3 text-lg font-semibold text-slate-950">
                        Job #{job.id} at {job.station?.name ?? 'Station'}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {job.station
                          ? [job.station.city, job.station.state].filter(Boolean).join(', ')
                          : 'Station location unavailable'}
                      </p>
                      <p className="mt-2 text-sm text-slate-600">
                        Customer: {job.customerUser?.email ?? 'Unknown customer'}
                      </p>
                    </div>
                    <div className="text-sm text-slate-600 sm:text-right">
                      <p>Priority {job.priority}</p>
                      <p>Updated {formatDateTime(job.updatedAt)}</p>
                    </div>
                  </div>
                  {job.driverNotes ? (
                    <p className="mt-3 rounded-lg bg-white px-3 py-2 text-sm text-slate-700">
                      {job.driverNotes}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDateTime(value: Date | string | null) {
  if (!value) {
    return 'TBD';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}
