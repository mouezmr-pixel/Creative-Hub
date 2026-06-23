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
    canViewFinancials: false,
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
    canViewFinancials: false,
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
