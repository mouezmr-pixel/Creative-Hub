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

// Demo accounts (admin/admin123, photographer1/photo123, client1/client123, ...) must
// never be seeded automatically in a real deployment. Seeding only runs when this is
// explicitly set to "true" — e.g. for local dev or a disposable demo environment.
// Production/staging deployments with real client data must leave this unset.
const ENABLE_DEMO_SEED = process.env.ENABLE_DEMO_SEED === "true";

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

    // Schema is managed by Drizzle (lib/db/src/schema) and applied via
    // `pnpm --filter @workspace/db run push` as an explicit deploy step.
    // Do NOT run ad-hoc ALTER/CREATE TABLE statements here on every boot —
    // multiple autoscale instances starting concurrently can race on raw DDL,
    // and it makes the schema impossible to audit from migration history alone.
    //
    // IMPORTANT (one-time manual step before deploying this change):
    // run `pnpm --filter @workspace/db run push` against the live database once
    // to confirm it already matches lib/db/src/schema (celebrities.phone/email,
    // monthly_packages, monthly_package_items, monthly_generation_log). All of
    // these are already declared in the schema files, so push should be a no-op
    // on a database that has been running this server — but verify before
    // removing this safety net in a real production environment.
    console.log("DATABASE: Skipping inline schema mutation (managed by drizzle-kit push)");

    // 1. Seed any missing demo users — opt-in only, see ENABLE_DEMO_SEED above.
    if (ENABLE_DEMO_SEED) {
      logger.warn("ENABLE_DEMO_SEED=true — seeding demo accounts. Do not use in production.");
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
        } else if (!existing.password.startsWith("$2")) {
          // Migrate plaintext password to bcrypt if needed
          const hashed = await bcrypt.hash(existing.password, 10);
          await db.update(usersTable).set({ password: hashed }).where(eq(usersTable.id, existing.id));
          console.log(`DATABASE: Migrated password for '${demo.username}' to bcrypt`);
          logger.info({ username: demo.username }, "Migrated password to bcrypt");
        }
      }
    }

    // 3. Migrate any other non-demo users that have plaintext passwords (always runs — real security hardening, not demo-specific)
    const allUsers = await db.select({ id: usersTable.id, username: usersTable.username, password: usersTable.password }).from(usersTable);
    for (const user of allUsers) {
      if (!user.password.startsWith("$2")) {
        const hashed = await bcrypt.hash(user.password, 10);
        await db.update(usersTable).set({ password: hashed }).where(eq(usersTable.id, user.id));
        console.log(`DATABASE: Migrated password for user id=${user.id} to bcrypt`);
        logger.info({ userId: user.id }, "Migrated password to bcrypt");
      }
    }

    // 4. Sync canViewFinancials for demo clients — opt-in only, see ENABLE_DEMO_SEED above.
    if (ENABLE_DEMO_SEED) {
      await db.execute(
        sql`UPDATE clients SET can_view_financials = true WHERE user_id IN (SELECT id FROM users WHERE username IN ('client1', 'client2'))`
      );
      console.log("DATABASE: Client financials synced");
    }

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
