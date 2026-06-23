import { pgTable, text, serial, boolean, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  role: text("role").notNull().default("photographer"),
  profession: text("profession"),
  paymentType: text("payment_type").notNull().default("per_project"),
  salaryAmount: numeric("salary_amount", { precision: 10, scale: 2 }),
  canViewFinancials: boolean("can_view_financials").notNull().default(false),
  canManageClients: boolean("can_manage_clients").notNull().default(false),
  canManageAllProjects: boolean("can_manage_all_projects").notNull().default(false),
  canInvoice: boolean("can_invoice").notNull().default(false),
  canViewLeads: boolean("can_view_leads").notNull().default(false),
  canViewAccounting: boolean("can_view_accounting").notNull().default(false),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
