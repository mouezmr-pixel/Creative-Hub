import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const clientsTable = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  originalIdea: text("original_idea"),
  aiGeneratedIdea: text("ai_generated_idea"),
  proposedIdea: text("proposed_idea"),
  photographerId: integer("photographer_id").references(() => usersTable.id, { onDelete: "set null" }),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  canViewProposal: boolean("can_view_proposal").notNull().default(true),
  canViewFinancials: boolean("can_view_financials").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertClientSchema = createInsertSchema(clientsTable).omit({ id: true, createdAt: true });
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clientsTable.$inferSelect;
