-- Add missing columns to celebrities table
ALTER TABLE "celebrities" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "celebrities" ADD COLUMN IF NOT EXISTS "email" text;

--> statement-breakpoint

-- Create monthly_packages table
CREATE TABLE IF NOT EXISTS "monthly_packages" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "client_id" integer NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
  "service_id" integer REFERENCES "services"("id") ON DELETE SET NULL,
  "currency" text NOT NULL DEFAULT 'TND',
  "notes" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint

-- Create monthly_package_items table
CREATE TABLE IF NOT EXISTS "monthly_package_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "package_id" integer NOT NULL REFERENCES "monthly_packages"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "price" text NOT NULL,
  "display_order" integer NOT NULL DEFAULT 0
);

--> statement-breakpoint

-- Create monthly_generation_log table
CREATE TABLE IF NOT EXISTS "monthly_generation_log" (
  "id" serial PRIMARY KEY NOT NULL,
  "package_id" integer NOT NULL REFERENCES "monthly_packages"("id") ON DELETE CASCADE,
  "project_id" integer NOT NULL,
  "month" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "monthly_generation_log_package_id_month_unique" UNIQUE("package_id", "month")
);
