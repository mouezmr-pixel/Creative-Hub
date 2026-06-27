import { pgTable, text, serial, integer, numeric, timestamp, boolean } from "drizzle-orm/pg-core";
import { clientsTable } from "./clients";
import { servicesTable } from "./services";

export const monthlyPackagesTable = pgTable("monthly_packages", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  serviceId: integer("service_id").references(() => servicesTable.id, { onDelete: "set null" }),
  currency: text("currency").notNull().default("TND"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
