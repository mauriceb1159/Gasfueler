CREATE TABLE "drivers" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "phone" varchar(30),
  "active" boolean NOT NULL DEFAULT true,
  "availability_status" varchar(30) NOT NULL DEFAULT 'offline',
  "current_station_id" integer REFERENCES "stations"("id"),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "dispatch_jobs" (
  "id" serial PRIMARY KEY NOT NULL,
  "fuel_request_id" integer REFERENCES "fuel_requests"("id"),
  "order_id" integer REFERENCES "orders"("id"),
  "job_type" varchar(30) NOT NULL,
  "customer_user_id" integer NOT NULL REFERENCES "users"("id"),
  "station_id" integer NOT NULL REFERENCES "stations"("id"),
  "status" varchar(30) NOT NULL DEFAULT 'unassigned',
  "priority" integer NOT NULL DEFAULT 0,
  "scheduled_start_at" timestamp,
  "scheduled_end_at" timestamp,
  "driver_notes" text,
  "dispatcher_notes" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "dispatch_assignments" (
  "id" serial PRIMARY KEY NOT NULL,
  "dispatch_job_id" integer NOT NULL REFERENCES "dispatch_jobs"("id"),
  "driver_id" integer NOT NULL REFERENCES "drivers"("id"),
  "assigned_by_user_id" integer NOT NULL REFERENCES "users"("id"),
  "assignment_status" varchar(30) NOT NULL DEFAULT 'assigned',
  "assigned_at" timestamp NOT NULL DEFAULT now(),
  "accepted_at" timestamp,
  "declined_at" timestamp
);

CREATE TABLE "driver_locations" (
  "id" serial PRIMARY KEY NOT NULL,
  "driver_id" integer NOT NULL REFERENCES "drivers"("id"),
  "latitude" varchar(30) NOT NULL,
  "longitude" varchar(30) NOT NULL,
  "heading" integer,
  "speed" integer,
  "captured_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "dispatch_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "dispatch_job_id" integer NOT NULL REFERENCES "dispatch_jobs"("id"),
  "actor_user_id" integer REFERENCES "users"("id"),
  "event_type" varchar(40) NOT NULL,
  "payload" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now()
);
