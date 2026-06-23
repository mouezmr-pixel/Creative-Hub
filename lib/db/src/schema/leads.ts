import { pgTable, text, serial, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { servicesTable } from "./services";

export const leadsTable = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  estimatedValue: numeric("estimated_value"),
  source: text("source").notNull().default("other"),
  status: text("status").notNull().default("new"),
  notes: text("notes"),
  projectName: text("project_name"),
  serviceId: integer("service_id").references(() => servicesTable.id, { onDelete: "set null" }),
  lostReason: text("lost_reason"),
  wonMonth: text("won_month"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLeadSchema = createInsertSchema(leadsTable).omit({ id: true, createdAt: true });
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leadsTable.$inferSelect;
