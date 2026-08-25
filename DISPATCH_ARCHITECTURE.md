# Dispatch Architecture

This document maps a driver dispatching system into the current FuelUp stack without requiring a separate backend rewrite.

## Bottom Line

You can build dispatching on the current stack:

- `Next.js` API routes as the backend surface
- shared service files in `lib/*-service.ts`
- `Postgres + Drizzle` as the source of truth
- Flutter as the future customer app and driver app

You do not need a separate Node.js backend just to start dispatching. Your current Next.js backend already runs in Node and is enough for the first dispatch version.

## Recommended Dispatch Model

### Core Actors

- Customer
- Dispatcher
- Driver
- Station / fulfillment location

### Core Records

- `dispatch_jobs`
- `dispatch_assignments`
- `driver_locations`
- `dispatch_events`

## Suggested Tables

### `drivers`

Purpose:
- mark which users can fulfill jobs
- store driver status and profile details

Suggested fields:
- `id`
- `user_id`
- `phone`
- `active`
- `availability_status`
- `current_station_id`
- `created_at`
- `updated_at`

### `dispatch_jobs`

Purpose:
- represent the work that needs to be fulfilled

Suggested fields:
- `id`
- `fuel_request_id` nullable
- `store_order_id` nullable
- `job_type` such as `fuel`, `store`, `combo`
- `customer_user_id`
- `station_id`
- `status` such as `unassigned`, `assigned`, `accepted`, `en_route`, `arrived`, `servicing`, `completed`, `canceled`
- `priority`
- `scheduled_start_at`
- `scheduled_end_at`
- `driver_notes`
- `dispatcher_notes`
- `created_at`
- `updated_at`

### `dispatch_assignments`

Purpose:
- track who was assigned and when

Suggested fields:
- `id`
- `dispatch_job_id`
- `driver_id`
- `assigned_by_user_id`
- `assignment_status` such as `assigned`, `accepted`, `declined`, `reassigned`
- `assigned_at`
- `accepted_at` nullable
- `declined_at` nullable

### `driver_locations`

Purpose:
- store latest known driver location

Suggested fields:
- `id`
- `driver_id`
- `latitude`
- `longitude`
- `heading` nullable
- `speed` nullable
- `captured_at`

### `dispatch_events`

Purpose:
- provide an audit trail for status changes

Suggested fields:
- `id`
- `dispatch_job_id`
- `actor_user_id` nullable
- `event_type`
- `payload` jsonb
- `created_at`

## How It Fits Current FuelUp Flows

### Fuel Request

Flow:
- customer creates `fuel_request`
- backend creates linked `dispatch_job`
- dispatcher assigns a driver
- driver accepts and fulfills
- dispatch/job/request statuses stay in sync

### Store Order

Flow:
- customer creates `store_order`
- backend creates linked `dispatch_job`
- dispatcher assigns driver or station runner
- driver fulfills pickup and delivery

### Combo Order

Flow:
- fuel request with store add-ons can map to one `dispatch_job`
- one driver fulfills both

## Recommended API Surface

### Dispatcher APIs

- `GET /api/dispatch/jobs`
- `GET /api/dispatch/jobs/:id`
- `POST /api/dispatch/jobs/:id/assign`
- `POST /api/dispatch/jobs/:id/reassign`
- `POST /api/dispatch/jobs/:id/cancel`
- `GET /api/dispatch/drivers`

### Driver APIs

- `GET /api/driver/jobs`
- `GET /api/driver/jobs/:id`
- `POST /api/driver/jobs/:id/accept`
- `POST /api/driver/jobs/:id/decline`
- `POST /api/driver/jobs/:id/status`
- `POST /api/driver/location`

### Customer APIs

- `GET /api/my-dispatch-jobs`
- `GET /api/my-dispatch-jobs/:id`

## Shared Service Layer

Recommended shared service files:

- `lib/dispatch-job-service.ts`
- `lib/driver-service.ts`
- `lib/dispatch-assignment-service.ts`
- `lib/driver-location-service.ts`

These should be called by:

- new dispatch API routes
- existing fuel/store services when jobs need to be created automatically
- future admin dashboard pages

## Realtime Strategy

The app should treat Postgres as the durable source of truth and realtime as a
delivery layer. All writes still go through authenticated API routes so status
rules, driver permissions, payments, fulfillment state, and audit events stay in
one backend path.

### Mobile Boundary

Flutter should depend on:

- `DispatchService` for durable reads and writes
- `DispatchRealtimeService` for live updates
- `DispatchPollingService` as the fallback when realtime is disabled or
  temporarily disconnected
- `PushNotificationService` for background/mobile notifications

This keeps Supabase, Firebase, or another realtime provider out of the UI layer.

### Current Supabase Path

- Use Supabase Realtime for filtered changes on:
  - `dispatch_jobs`
  - `dispatch_assignments`
  - `driver_locations`
- Keep channels scoped to the current board, driver, or job.
- Do not broadcast every driver location to every connected user.
- For larger production scale, prefer Supabase Broadcast/private channels fed by
  database triggers or backend events over broad Postgres change subscriptions.

### Push Notifications

Firebase Cloud Messaging can be added later behind `PushNotificationService`. It
should notify inactive/backgrounded devices about important events such as new
assignments, cancellations, and schedule changes. It should not replace the
dispatch source-of-truth tables.

## Recommended Build Order

1. Add `drivers` and `dispatch_jobs` tables.
2. Auto-create a dispatch job when a fuel request or store order is created.
3. Build dispatcher admin APIs and a basic dispatch board.
4. Build driver mobile APIs for assigned jobs and status updates.
5. Add driver location updates.
6. Add realtime subscriptions behind `DispatchRealtimeService`.
7. Add Firebase Cloud Messaging for background notifications when needed.

## Safety Rules

- keep dispatching additive to existing request and order flows
- do not replace current booking/order logic
- keep existing fulfillment data working while dispatch tables are introduced
- sync statuses through shared service functions instead of duplicating rules

## Practical Recommendation

Start with:

- one dispatch job per fuel request or store order
- one assigned driver
- manual dispatcher assignment
- polling instead of realtime

That is enough to prove the system and launch a reliable first version.
