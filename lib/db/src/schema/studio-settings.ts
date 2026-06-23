import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const studioSettingsTable = pgTable("studio_settings", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("Creative Studio"),
  description: text("description").default(""),
  // Invoice company info
  address: text("address").default(""),
  phone: text("phone").default(""),
  email: text("email").default(""),
  website: text("website").default(""),
  taxId: text("tax_id").default(""),
  // Invoice customization
  invoicePrefix: text("invoice_prefix").default("INV-"),
  proformaPrefix: text("proforma_prefix").default("PF-"),
  paymentTerms: text("payment_terms").default(""),
  invoiceFooter: text("invoice_footer").default(""),
  invoiceNotes: text("invoice_notes").default(""),
  // Branding assets
  logoUrl: text("logo_url").default(""),
  stampUrl: text("stamp_url").default(""),
  showStamp: text("show_stamp").default("true"),
  showSignature: text("show_signature").default("true"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStudioSettingsSchema = createInsertSchema(studioSettingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStudioSettings = z.infer<typeof insertStudioSettingsSchema>;
export type StudioSettings = typeof studioSettingsTable.$inferSelect;

export const updateStudioSettingsSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  taxId: z.string().optional(),
  invoicePrefix: z.string().optional(),
  proformaPrefix: z.string().optional(),
  paymentTerms: z.string().optional(),
  invoiceFooter: z.string().optional(),
  invoiceNotes: z.string().optional(),
  logoUrl: z.string().optional(),
  stampUrl: z.string().optional(),
  showStamp: z.string().optional(),
  showSignature: z.string().optional(),
});
export type UpdateStudioSettings = z.infer<typeof updateStudioSettingsSchema>;
