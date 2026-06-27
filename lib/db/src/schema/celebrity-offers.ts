import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { celebritiesTable } from "./celebrities";

export const celebrityOffersTable = pgTable("celebrity_offers", {
  id: serial("id").primaryKey(),
  celebrityId: integer("celebrity_id").notNull().references(() => celebritiesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  budget: numeric("budget", { precision: 12, scale: 2 }),
  status: text("status").notNull().default("pending"),
  scenario: text("scenario"),
  script: text("script"),
  idea: text("idea"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCelebrityOfferSchema = createInsertSchema(celebrityOffersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCelebrityOffer = z.infer<typeof insertCelebrityOfferSchema>;
export type CelebrityOffer = typeof celebrityOffersTable.$inferSelect;
