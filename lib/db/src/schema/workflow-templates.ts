import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const workflowTemplatesTable = pgTable("workflow_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const templateMilestonesTable = pgTable("template_milestones", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => workflowTemplatesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  titleAr: text("title_ar"),
  titleFr: text("title_fr"),
  description: text("description"),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectMilestonesTable = pgTable("project_milestones", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  titleAr: text("title_ar"),
  titleFr: text("title_fr"),
  description: text("description"),
  order: integer("order").notNull().default(0),
  isCompleted: boolean("is_completed").notNull().default(false),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
