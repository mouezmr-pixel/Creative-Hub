import { pgTable, text, serial, integer, numeric, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";
import { servicesTable } from "./services";

export const campaignStatusEnum = pgEnum("campaign_status", ["draft", "active", "completed", "archived"]);
export const campaignTypeEnum = pgEnum("campaign_type", ["seasonal", "event", "promotion", "product_launch", "other"]);

export const campaignsTable = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  nameFr: text("name_fr"),
  description: text("description"),
  descriptionAr: text("description_ar"),
  descriptionFr: text("description_fr"),
  type: text("type").notNull().default("other"),
  status: text("status").notNull().default("draft"),
  clientId: integer("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  budget: numeric("budget", { precision: 12, scale: 2 }),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  coverImage: text("cover_image"),
  proposalContent: text("proposal_content"),
  proposalContentAr: text("proposal_content_ar"),
  proposalContentFr: text("proposal_content_fr"),
  shared: boolean("shared").notNull().default(false),
  sharedAt: timestamp("shared_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const campaignServicesTable = pgTable("campaign_services", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaignsTable.id, { onDelete: "cascade" }),
  serviceId: integer("service_id").notNull().references(() => servicesTable.id, { onDelete: "cascade" }),
  customPrice: numeric("custom_price", { precision: 10, scale: 2 }),
  notes: text("notes"),
});

export const campaignMilestonesTable = pgTable("campaign_milestones", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaignsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  titleAr: text("title_ar"),
  titleFr: text("title_fr"),
  description: text("description"),
  order: integer("order").notNull().default(0),
  dueDate: timestamp("due_date", { withTimezone: true }),
  isCompleted: boolean("is_completed").notNull().default(false),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCampaignSchema = createInsertSchema(campaignsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCampaignServiceSchema = createInsertSchema(campaignServicesTable).omit({ id: true });
export const insertCampaignMilestoneSchema = createInsertSchema(campaignMilestonesTable).omit({ id: true, createdAt: true });

export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaignsTable.$inferSelect;
export type CampaignService = typeof campaignServicesTable.$inferSelect;
export type CampaignMilestone = typeof campaignMilestonesTable.$inferSelect;
