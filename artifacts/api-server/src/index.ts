import app from "./app";
import { logger } from "./lib/logger";
import { db, usersTable } from "@workspace/db";
import bcrypt from "bcrypt";
import { eq, sql } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const DEMO_USERS = [
  {
    username: "admin",
    password: "admin123",
    name: "Studio Admin",
    email: "admin@creativestudio.com",
    role: "admin" as const,
    profession: null,
    canViewFinancials: false,
    canManageClients: false,
    canManageAllProjects: false,
    canInvoice: false,
    canViewLeads: false,
    canViewAccounting: false,
  },
  {
    username: "photographer1",
    password: "photo123",
    name: "Alex Dupont",
    email: "alex@creativestudio.com",
    role: "photographer" as const,
    profession: "photographer",
    canViewFinancials: true,
    canManageClients: true,
    canManageAllProjects: true,
    canInvoice: true,
    canViewLeads: true,
    canViewAccounting: true,
  },
  {
    username: "photographer2",
    password: "photo123",
    name: "Sofia Martinez",
    email: "sofia@creativestudio.com",
    role: "photographer" as const,
    profession: "editor",
    canViewFinancials: false,
    canManageClients: false,
    canManageAllProjects: false,
    canInvoice: false,
    canViewLeads: false,
    canViewAccounting: false,
  },
  {
    username: "photographer3",
    password: "photo123",
    name: "Liam Chen",
    email: "liam@creativestudio.com",
    role: "photographer" as const,
    profession: "designer",
    canViewFinancials: false,
    canManageClients: false,
    canManageAllProjects: false,
    canInvoice: false,
    canViewLeads: false,
    canViewAccounting: false,
  },
  {
    username: "client1",
    password: "client123",
    name: "Sarah Johnson",
    email: "sarah@example.com",
    role: "client" as const,
    profession: null,
    canViewFinancials: true,
    canManageClients: false,
    canManageAllProjects: false,
    canInvoice: false,
    canViewLeads: false,
    canViewAccounting: false,
  },
  {
    username: "client2",
    password: "client123",
    name: "Omar Khalid",
    email: "omar@example.com",
    role: "client" as const,
    profession: null,
    canViewFinancials: true,
    canManageClients: false,
    canManageAllProjects: false,
    canInvoice: false,
    canViewLeads: false,
    canViewAccounting: false,
  },
];

async function initializeDatabase() {
  try {
    console.log("DATABASE: Running startup initialization...");

    // Fix schema mismatches from previous migrations
    await db.execute(sql.raw(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='monthly_generation_log' AND column_name='generated_at') THEN
          ALTER TABLE monthly_generation_log RENAME COLUMN generated_at TO created_at;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='monthly_generation_log' AND column_name='project_id' AND is_nullable='YES') THEN
          ALTER TABLE monthly_generation_log ALTER COLUMN project_id SET NOT NULL;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='monthly_package_items' AND column_name='price' AND data_type='numeric') THEN
          ALTER TABLE monthly_package_items ALTER COLUMN price TYPE TEXT;
        END IF;
      END $$;
    `));

    // Ensure required tables and columns exist
    await db.execute(sql.raw(`
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
    `));
    console.log("✅ Database tables verified");

    // Create the session table for connect-pg-simple if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL,
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire")
    `);
    console.log("DATABASE: Session table ready");

    // 1. Seed any missing demo users
    for (const demo of DEMO_USERS) {
      const [existing] = await db
        .select({ id: usersTable.id, password: usersTable.password })
        .from(usersTable)
        .where(eq(usersTable.username, demo.username));

      if (!existing) {
        const hashedPassword = await bcrypt.hash(demo.password, 10);
        await db.insert(usersTable).values({
          username: demo.username,
          password: hashedPassword,
          name: demo.name,
          email: demo.email,
          role: demo.role,
          profession: demo.profession,
          canViewFinancials: demo.canViewFinancials,
          canManageClients: demo.canManageClients,
          canManageAllProjects: demo.canManageAllProjects,
          canInvoice: demo.canInvoice,
          canViewLeads: demo.canViewLeads,
          canViewAccounting: demo.canViewAccounting,
        });
        console.log(`DATABASE: Created user '${demo.username}' (${demo.role})`);
        logger.info({ username: demo.username, role: demo.role }, "Seeded demo user");
      } else if (demo.role === "client") {
        // Sync canViewFinancials for existing demo clients
        await db
          .update(usersTable)
          .set({ canViewFinancials: demo.canViewFinancials })
          .where(eq(usersTable.id, existing.id));
      } else {
        // 2. Migrate plaintext password to bcrypt if needed
        if (!existing.password.startsWith("$2")) {
          const hashed = await bcrypt.hash(existing.password, 10);
          await db.update(usersTable).set({ password: hashed }).where(eq(usersTable.id, existing.id));
          console.log(`DATABASE: Migrated password for '${demo.username}' to bcrypt`);
          logger.info({ username: demo.username }, "Migrated password to bcrypt");
        }
      }
    }

    // 3. Also migrate any other non-demo users that have plaintext passwords
    const allUsers = await db.select({ id: usersTable.id, username: usersTable.username, password: usersTable.password }).from(usersTable);
    for (const user of allUsers) {
      if (!user.password.startsWith("$2")) {
        const hashed = await bcrypt.hash(user.password, 10);
        await db.update(usersTable).set({ password: hashed }).where(eq(usersTable.id, user.id));
        console.log(`DATABASE: Migrated password for user id=${user.id} to bcrypt`);
        logger.info({ userId: user.id }, "Migrated password to bcrypt");
      }
    }

    // 4. Sync canViewFinancials for demo clients in the clients table
    await db.execute(
      sql`UPDATE clients SET can_view_financials = true WHERE user_id IN (SELECT id FROM users WHERE username IN ('client1', 'client2'))`
    );
    console.log("DATABASE: Client financials synced");

    console.log("DATABASE: Admin user created/verified successfully");
    logger.info("Database initialization complete");
  } catch (err) {
    console.error("DATABASE: Initialization error:", err);
    logger.error({ err }, "Database initialization error");
  }
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  initializeDatabase();
});
