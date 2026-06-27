import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { monthlyPackagesTable } from "./monthly-packages";

export const monthlyPackageItemsTable = pgTable("monthly_package_items", {
  id: serial("id").primaryKey(),
  packageId: integer("package_id").notNull().references(() => monthlyPackagesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  price: text("price").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
});
