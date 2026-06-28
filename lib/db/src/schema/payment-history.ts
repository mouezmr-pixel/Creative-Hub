import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { usersTable } from "./users";

export const paymentHistoryTable = pgTable("payment_history", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("DZD"),
  paymentMethod: text("payment_method"),
  receiptNumber: text("receipt_number").unique(),
  paymentDate: timestamp("payment_date", { withTimezone: true }).notNull().defaultNow(),
  notes: text("notes"),
  // Nullable on purpose: legacy rows backfilled by scripts/migrate-amountpaid.mjs
  // have no recorder. New rows should always set this from the session user.
  recordedBy: integer("recorded_by").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(paymentHistoryTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentHistoryTable.$inferSelect;
