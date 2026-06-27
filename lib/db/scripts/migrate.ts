import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const sql = `
-- Fix monthly_generation_log column name (generated_at → created_at)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='monthly_generation_log' AND column_name='generated_at') THEN
    ALTER TABLE monthly_generation_log RENAME COLUMN generated_at TO created_at;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='monthly_generation_log' AND column_name='project_id' AND is_nullable='YES') THEN
    ALTER TABLE monthly_generation_log ALTER COLUMN project_id SET NOT NULL;
  END IF;
END $$;

-- Fix monthly_package_items price type (numeric → text)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='monthly_package_items' AND column_name='price' AND data_type='numeric') THEN
    ALTER TABLE monthly_package_items ALTER COLUMN price TYPE TEXT;
  END IF;
END $$;

-- Ensure celebrities columns exist
ALTER TABLE celebrities ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE celebrities ADD COLUMN IF NOT EXISTS email TEXT;

CREATE TABLE IF NOT EXISTS monthly_packages (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
  currency TEXT NOT NULL DEFAULT 'TND',
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monthly_package_items (
  id SERIAL PRIMARY KEY,
  package_id INTEGER NOT NULL REFERENCES monthly_packages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  price TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS monthly_generation_log (
  id SERIAL PRIMARY KEY,
  package_id INTEGER NOT NULL REFERENCES monthly_packages(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL,
  month TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(package_id, month)
);
`;

async function main() {
  await pool.query(sql);
  console.log("Migration applied successfully");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
