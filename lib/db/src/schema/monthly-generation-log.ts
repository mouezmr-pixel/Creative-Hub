import { pgTable, text, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { monthlyPackagesTable } from "./monthly-packages";

export const monthlyGenerationLogTable = pgTable("monthly_generation_log", {
  id: serial("id").primaryKey(),
  packageId: integer("package_id").notNull().references(() => monthlyPackagesTable.id, { onDelete: "cascade" }),
  projectId: integer("project_id").notNull(),
  month: text("month").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniquePackageMonth: unique().on(t.packageId, t.month),
}));
