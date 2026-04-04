CREATE TABLE IF NOT EXISTS "stations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"address" varchar(255) NOT NULL,
	"city" varchar(100) NOT NULL,
	"state" varchar(50) NOT NULL,
	"zip" varchar(20) NOT NULL,
	"latitude" varchar(30),
	"longitude" varchar(30),
	"active" boolean DEFAULT true NOT NULL,
	"supports_snacks" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "station_hours" (
	"id" serial PRIMARY KEY NOT NULL,
	"station_id" integer NOT NULL,
	"day_of_week" integer NOT NULL,
	"open_time" varchar(10) NOT NULL,
	"close_time" varchar(10) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "service_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"station_id" integer NOT NULL,
	"start_at" timestamp NOT NULL,
	"end_at" timestamp NOT NULL,
	"capacity" integer DEFAULT 1 NOT NULL,
	"booked_count" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vehicles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"nickname" varchar(100),
	"make" varchar(100),
	"model" varchar(100),
	"color" varchar(50),
	"license_plate" varchar(30) NOT NULL,
	"fuel_type" varchar(30),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fuel_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"station_id" integer NOT NULL,
	"vehicle_id" integer NOT NULL,
	"slot_id" integer NOT NULL,
	"fuel_grade" varchar(30) NOT NULL,
	"request_type" varchar(30) NOT NULL,
	"requested_gallons" integer,
	"requested_dollar_amount" integer,
	"fuel_estimate" integer,
	"service_fee" integer DEFAULT 0 NOT NULL,
	"addon_total" integer DEFAULT 0 NOT NULL,
	"total_estimate" integer DEFAULT 0 NOT NULL,
	"status" varchar(30) DEFAULT 'draft' NOT NULL,
	"special_instructions" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fuel_request_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"fuel_request_id" integer NOT NULL,
	"item_name" varchar(120) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "request_status_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"fuel_request_id" integer NOT NULL,
	"status" varchar(30) NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "station_hours" ADD CONSTRAINT "station_hours_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "service_slots" ADD CONSTRAINT "service_slots_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fuel_requests" ADD CONSTRAINT "fuel_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fuel_requests" ADD CONSTRAINT "fuel_requests_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fuel_requests" ADD CONSTRAINT "fuel_requests_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fuel_requests" ADD CONSTRAINT "fuel_requests_slot_id_service_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."service_slots"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fuel_request_items" ADD CONSTRAINT "fuel_request_items_fuel_request_id_fuel_requests_id_fk" FOREIGN KEY ("fuel_request_id") REFERENCES "public"."fuel_requests"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "request_status_events" ADD CONSTRAINT "request_status_events_fuel_request_id_fuel_requests_id_fk" FOREIGN KEY ("fuel_request_id") REFERENCES "public"."fuel_requests"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "request_status_events" ADD CONSTRAINT "request_status_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
