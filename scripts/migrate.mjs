import pg from "/home/runner/workspace/node_modules/.pnpm/pg@8.20.0/node_modules/pg/lib/index.js";
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  const sqls = [
    `CREATE TABLE IF NOT EXISTS "session" ("sid" varchar NOT NULL, "sess" json NOT NULL, "expire" timestamp(6) NOT NULL, CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE)`,
    `CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire")`,
    `CREATE TABLE IF NOT EXISTS "users" ("id" serial PRIMARY KEY, "username" text NOT NULL UNIQUE, "password" text NOT NULL, "name" text NOT NULL, "email" text, "role" text NOT NULL DEFAULT 'photographer', "profession" text, "payment_type" text NOT NULL DEFAULT 'per_project', "salary_amount" numeric(10,2), "can_view_financials" boolean NOT NULL DEFAULT false, "can_manage_clients" boolean NOT NULL DEFAULT false, "can_manage_all_projects" boolean NOT NULL DEFAULT false, "can_invoice" boolean NOT NULL DEFAULT false, "can_view_leads" boolean NOT NULL DEFAULT false, "can_view_accounting" boolean NOT NULL DEFAULT false, "created_at" timestamptz NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS "clients" ("id" serial PRIMARY KEY, "name" text NOT NULL, "email" text, "phone" text, "original_idea" text, "ai_generated_idea" text, "proposed_idea" text, "photographer_id" integer, "user_id" integer, "created_at" timestamptz NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS "services" ("id" serial PRIMARY KEY, "title" text NOT NULL, "description" text, "price" numeric(10,2) NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS "projects" ("id" serial PRIMARY KEY, "title" text NOT NULL, "client_id" integer NOT NULL, "photographer_id" integer, "service_id" integer, "status" text NOT NULL DEFAULT 'pending', "progress" integer NOT NULL DEFAULT 0, "start_date" text, "delivery_date" text, "we_transfer_link" text, "expected_cost" numeric(10,2), "final_cost" numeric(10,2), "amount_paid" numeric(10,2), "currency" text NOT NULL DEFAULT 'DZD', "client_original_idea" text, "team_proposal" text, "ai_instructions" text, "ai_enhanced_idea" text, "original_client_idea" text, "ai_generated_suggestion" text, "final_proposed_idea" text, "proforma_issued_at" timestamptz, "final_invoice_issued_at" timestamptz, "created_at" timestamptz NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS "notes" ("id" serial PRIMARY KEY, "project_id" integer NOT NULL, "author_id" integer NOT NULL, "content" text NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS "project_assignees" ("id" serial PRIMARY KEY, "project_id" integer NOT NULL, "user_id" integer NOT NULL, "commission_type" text, "commission_value" numeric(10,2), "created_at" timestamptz NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS "leads" ("id" serial PRIMARY KEY, "name" text NOT NULL, "phone" text, "email" text, "estimated_value" numeric, "source" text NOT NULL DEFAULT 'other', "status" text NOT NULL DEFAULT 'new', "notes" text, "created_at" timestamptz NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS "expenses" ("id" serial PRIMARY KEY, "category" text NOT NULL, "amount" numeric NOT NULL, "date" date NOT NULL, "description" text, "created_at" timestamptz NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS "workflow_templates" ("id" serial PRIMARY KEY, "name" text NOT NULL, "description" text, "created_at" timestamptz NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS "template_milestones" ("id" serial PRIMARY KEY, "template_id" integer NOT NULL, "title" text NOT NULL, "title_ar" text, "title_fr" text, "description" text, "order" integer NOT NULL DEFAULT 0, "created_at" timestamptz NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS "project_milestones" ("id" serial PRIMARY KEY, "project_id" integer NOT NULL, "title" text NOT NULL, "title_ar" text, "title_fr" text, "description" text, "order" integer NOT NULL DEFAULT 0, "is_completed" boolean NOT NULL DEFAULT false, "completed_at" timestamptz, "created_at" timestamptz NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS "payment_history" ("id" serial PRIMARY KEY, "project_id" integer NOT NULL REFERENCES projects(id) ON DELETE CASCADE, "amount" numeric(12,2) NOT NULL, "currency" text NOT NULL DEFAULT 'DZD', "payment_method" text, "receipt_number" text UNIQUE, "payment_date" timestamptz NOT NULL DEFAULT now(), "notes" text, "recorded_by" integer, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now())`,
  ];
  for (const sql of sqls) {
    await client.query(sql);
    console.log("OK:", sql.slice(0, 80));
  }
  console.log("All tables created successfully!");
} finally {
  client.release();
  await pool.end();
}
