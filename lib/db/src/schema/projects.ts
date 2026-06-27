import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";
import { usersTable } from "./users";
import { servicesTable } from "./services";

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "restrict" }),
  photographerId: integer("photographer_id").references(() => usersTable.id, { onDelete: "set null" }),
  serviceId: integer("service_id").references(() => servicesTable.id, { onDelete: "set null" }),
  status: text("status").notNull().default("pending"),
  progress: integer("progress").notNull().default(0),
  startDate: text("start_date"),
  deliveryDate: text("delivery_date"),
  weTransferLink: text("we_transfer_link"),
  expectedCost: numeric("expected_cost", { precision: 10, scale: 2 }),
  finalCost: numeric("final_cost", { precision: 10, scale: 2 }),
  amountPaid: numeric("amount_paid", { precision: 10, scale: 2 }),
  discount: numeric("discount", { precision: 10, scale: 2 }).default("0"),
  currency: text("currency").notNull().default("DZD"),
  originalClientIdea: text("original_client_idea"),
  aiGeneratedSuggestion: text("ai_generated_suggestion"),
  finalProposedIdea: text("final_proposed_idea"),
  proformaIssuedAt: timestamp("proforma_issued_at", { withTimezone: true }),
  finalInvoiceIssuedAt: timestamp("final_invoice_issued_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
