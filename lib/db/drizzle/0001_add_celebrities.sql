CREATE TABLE IF NOT EXISTS "celebrities" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"photo_url" text,
	"age_groups" text,
	"birth_date" text,
	"interests" text,
	"tags" text,
	"min_price" numeric(10, 2),
	"max_price" numeric(10, 2),
	"bio" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
