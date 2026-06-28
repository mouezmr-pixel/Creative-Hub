import { pgTable, text, serial, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const celebritiesTable = pgTable("celebrities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  photoUrl: text("photo_url"),
  ageGroups: text("age_groups"),
  birthDate: text("birth_date"),
  interests: text("interests"),
  tags: text("tags"),
  minPrice: numeric("min_price", { precision: 10, scale: 2 }),
  maxPrice: numeric("max_price", { precision: 10, scale: 2 }),
  bio: text("bio"),
  platforms: text("platforms"),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCelebritySchema = createInsertSchema(celebritiesTable).omit({ id: true, createdAt: true });
export type InsertCelebrity = z.infer<typeof insertCelebritySchema>;
export type Celebrity = typeof celebritiesTable.$inferSelect;

export const celebrityResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  image: z.string().nullable(),
  audiences: z.array(z.string()),
  interests: z.array(z.string()),
  dateOfBirth: z.string().nullable(),
  age: z.number().nullable(),
  tags: z.array(z.string()),
  priceMin: z.number().nullable(),
  priceMax: z.number().nullable(),
  bio: z.string().nullable(),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type CelebrityResponse = z.infer<typeof celebrityResponseSchema>;
