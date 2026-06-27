import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, studioSettingsTable } from "@workspace/db";
import { updateStudioSettingsSchema } from "@workspace/db/schema/studio-settings";
import type { StudioSettings } from "@workspace/db/schema/studio-settings";
import { requireAccess } from "../middlewares/auth";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const router: IRouter = Router();

const PROJECT_ROOT = path.resolve(import.meta.dirname ?? process.cwd(), "..");
const UPLOADS_DIR = path.join(PROJECT_ROOT, "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

async function getOrCreateSettings() {
  const [existing] = await db.select().from(studioSettingsTable).where(eq(studioSettingsTable.id, 1));
  if (existing) return existing;
  const [created] = await db.insert(studioSettingsTable).values({ name: "Creative Studio", description: "" }).returning();
  return created;
}

function toResponse(s: StudioSettings) {
  return {
    name: s.name,
    description: s.description ?? "",
    address: s.address ?? "",
    phone: s.phone ?? "",
    email: s.email ?? "",
    website: s.website ?? "",
    taxId: s.taxId ?? "",
    invoicePrefix: s.invoicePrefix ?? "INV-",
    proformaPrefix: s.proformaPrefix ?? "PF-",
    paymentTerms: s.paymentTerms ?? "",
    invoiceFooter: s.invoiceFooter ?? "",
    invoiceNotes: s.invoiceNotes ?? "",
    logoUrl: s.logoUrl ?? "",
    stampUrl: s.stampUrl ?? "",
    showStamp: s.showStamp ?? true,
    showSignature: s.showSignature ?? true,
  };
}

router.get("/settings", async (_req, res): Promise<void> => {
  try {
    const settings = await getOrCreateSettings();
    res.json(toResponse(settings));
  } catch {
    res.json(toResponse({
      id: 1, name: "Creative Studio", description: "",
      address: "", phone: "", email: "", website: "", taxId: "",
      invoicePrefix: "INV-", proformaPrefix: "PF-",
      paymentTerms: "", invoiceFooter: "", invoiceNotes: "",
      logoUrl: "", stampUrl: "", showStamp: true, showSignature: true,
      createdAt: new Date(), updatedAt: new Date(),
    }));
  }
});

router.put("/settings", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;
  const parsed = updateStudioSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await getOrCreateSettings();
  const [updated] = await db.update(studioSettingsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(studioSettingsTable.id, 1))
    .returning();
  res.json(toResponse(updated));
});

router.post("/settings/upload", async (req, res) => {
  try {
    if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;

    const { data, name } = req.body as { data?: string; name?: string };
    if (!data || typeof data !== "string") {
      res.status(400).json({ error: "No image data provided" });
      return;
    }

    const matches = data.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,(.+)$/);
    if (!matches) {
      res.status(400).json({ error: "Invalid image format. Supported: PNG, JPG, GIF, WEBP" });
      return;
    }

    const ext = matches[1].replace("jpeg", "jpg");
    const base64 = matches[2];
    const buffer = Buffer.from(base64, "base64");

    if (buffer.length > 2 * 1024 * 1024) {
      res.status(400).json({ error: "File too large. Maximum size is 2MB." });
      return;
    }

    const filename = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
    const filepath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(filepath, buffer);
    res.json({ url: `/uploads/${filename}` });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Upload failed" });
  }
});

export default router;