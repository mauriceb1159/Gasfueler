CREATE TABLE IF NOT EXISTS "contact_inquiries" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"company" varchar(120),
	"inquiry_type" varchar(40) NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
