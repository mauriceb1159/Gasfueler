import 'server-only';

import { eq, inArray } from 'drizzle-orm';

import { USER_ROLES } from '@/lib/auth/roles';
import { db } from '@/lib/db/drizzle';
import {
  dispatchJobs,
  drivers,
  DriverAvailabilityStatus,
  users,
} from '@/lib/db/schema';
import { sendEmail } from '@/lib/email/send';

type DispatchAlertKind =
  | 'booking_created'
  | 'driver_assigned'
  | 'driver_status_updated'
  | 'customer_arrived';

type DispatchAlertContext = {
  jobId: number;
  orderId: number | null;
  fuelRequestId: number | null;
  jobType: string;
  status: string;
  stationName: string;
  stationAddress: string;
  customerEmail: string;
  customerName: string | null;
  assignedDriverEmails: string[];
};

export async function notifyBookingCreated(dispatchJobId: number) {
  await notifyDispatchEvent({
    kind: 'booking_created',
    dispatchJobId,
    audience: 'ops_and_available_drivers',
    subject: (context) => `New GasBite booking: Job #${context.jobId}`,
    message: (context) =>
      [
        `A new ${context.jobType} dispatch job was created.`,
        `Job #: ${context.jobId}`,
        context.orderId ? `Order #: ${context.orderId}` : null,
        context.fuelRequestId ? `Fuel request #: ${context.fuelRequestId}` : null,
        `Customer: ${context.customerEmail}`,
        `Location: ${context.stationName}, ${context.stationAddress}`,
      ]
        .filter(Boolean)
        .join('\n'),
  });
}

export async function notifyDriverAssigned(dispatchJobId: number) {
  await notifyDispatchEvent({
    kind: 'driver_assigned',
    dispatchJobId,
    audience: 'assigned_drivers_and_ops',
    subject: (context) => `GasBite job assigned: Job #${context.jobId}`,
    message: (context) =>
      [
        `You have been assigned to a ${context.jobType} dispatch job.`,
        `Job #: ${context.jobId}`,
        `Customer: ${context.customerEmail}`,
        `Location: ${context.stationName}, ${context.stationAddress}`,
      ].join('\n'),
  });
}

export async function notifyDriverStatusUpdated(
  dispatchJobId: number,
  status: string
) {
  await notifyDispatchEvent({
    kind: 'driver_status_updated',
    dispatchJobId,
    audience: 'ops_only',
    subject: (context) => `GasBite job #${context.jobId} is ${status}`,
    message: (context) =>
      [
        `Driver status updated to ${status}.`,
        `Job #: ${context.jobId}`,
        `Customer: ${context.customerEmail}`,
        `Location: ${context.stationName}, ${context.stationAddress}`,
      ].join('\n'),
  });
}

export async function notifyCustomerArrived(dispatchJobId: number) {
  await notifyDispatchEvent({
    kind: 'customer_arrived',
    dispatchJobId,
    audience: 'assigned_drivers_and_ops',
    subject: (context) => `Customer arrived for GasBite job #${context.jobId}`,
    message: (context) =>
      [
        `The customer has arrived at the service location.`,
        `Job #: ${context.jobId}`,
        context.orderId ? `Order #: ${context.orderId}` : null,
        `Customer: ${context.customerEmail}`,
        `Location: ${context.stationName}, ${context.stationAddress}`,
      ]
        .filter(Boolean)
        .join('\n'),
  });
}

async function notifyDispatchEvent({
  kind,
  dispatchJobId,
  audience,
  subject,
  message,
}: {
  kind: DispatchAlertKind;
  dispatchJobId: number;
  audience: 'ops_only' | 'assigned_drivers_and_ops' | 'ops_and_available_drivers';
  subject: (context: DispatchAlertContext) => string;
  message: (context: DispatchAlertContext) => string;
}) {
  const context = await getDispatchAlertContext(dispatchJobId);

  if (!context) {
    console.warn(`[dispatch-alert:${kind}] Missing job #${dispatchJobId}.`);
    return;
  }

  const recipientEmails = await getRecipientEmails(context, audience);
  const text = message(context);

  console.info(`[dispatch-alert:${kind}] ${subject(context)}\n${text}`);

  if (recipientEmails.length === 0) {
    return;
  }

  const html = renderAlertHtml(subject(context), text);

  const results = await Promise.allSettled(
    recipientEmails.map((to) =>
      sendEmail({
        to,
        subject: subject(context),
        html,
        text,
      })
    )
  );

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(
        `[dispatch-alert:${kind}] Failed to alert ${recipientEmails[index]}.`,
        result.reason
      );
    }
  });
}

async function getDispatchAlertContext(
  dispatchJobId: number
): Promise<DispatchAlertContext | null> {
  const job = await db.query.dispatchJobs.findFirst({
    where: (jobs, { eq }) => eq(jobs.id, dispatchJobId),
    with: {
      customerUser: {
        columns: {
          email: true,
          name: true,
        },
      },
      station: {
        columns: {
          name: true,
          address: true,
          city: true,
          state: true,
          zip: true,
        },
      },
      assignments: {
        with: {
          driver: {
            with: {
              user: {
                columns: {
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!job) {
    return null;
  }

  return {
    jobId: job.id,
    orderId: job.orderId,
    fuelRequestId: job.fuelRequestId,
    jobType: job.jobType,
    status: job.status,
    stationName: job.station.name,
    stationAddress: [
      job.station.address,
      job.station.city,
      job.station.state,
      job.station.zip,
    ]
      .filter(Boolean)
      .join(', '),
    customerEmail: job.customerUser.email,
    customerName: job.customerUser.name,
    assignedDriverEmails: job.assignments
      .map((assignment) => assignment.driver.user.email)
      .filter(Boolean),
  };
}

async function getRecipientEmails(
  context: DispatchAlertContext,
  audience: 'ops_only' | 'assigned_drivers_and_ops' | 'ops_and_available_drivers'
) {
  const recipients = new Set<string>();

  for (const email of getConfiguredOpsEmails()) {
    recipients.add(email);
  }

  const opsUsers = await db
    .select({ email: users.email })
    .from(users)
    .where(
      inArray(users.role, [
        USER_ROLES.DISPATCHER,
        USER_ROLES.ADMIN,
        USER_ROLES.MAIN_ADMIN,
        USER_ROLES.FUEL_ATTENDANT,
      ])
    );

  opsUsers.forEach((user) => recipients.add(user.email));

  if (audience === 'assigned_drivers_and_ops') {
    context.assignedDriverEmails.forEach((email) => recipients.add(email));
  }

  if (audience === 'ops_and_available_drivers') {
    const availableDrivers = await db
      .select({ email: users.email })
      .from(drivers)
      .innerJoin(users, eq(users.id, drivers.userId))
      .where(
        inArray(drivers.availabilityStatus, [
          DriverAvailabilityStatus.AVAILABLE,
          DriverAvailabilityStatus.ON_JOB,
        ])
      );

    availableDrivers.forEach((driver) => recipients.add(driver.email));
  }

  return [...recipients];
}

function getConfiguredOpsEmails() {
  return (process.env.DISPATCH_ALERT_EMAILS || '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);
}

function renderAlertHtml(subject: string, text: string) {
  const lines = text
    .split('\n')
    .map((line) => `<p style="margin: 0 0 8px;">${escapeHtml(line)}</p>`)
    .join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; color: #0f172a;">
      <h1 style="margin: 0 0 16px; font-size: 24px;">${escapeHtml(subject)}</h1>
      <div style="border: 1px solid #fed7aa; border-radius: 18px; padding: 18px; background: #fff7ed;">
        ${lines}
      </div>
    </div>
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
