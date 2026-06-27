import { Router, type IRouter } from "express";
import { eq, isNull } from "drizzle-orm";
import { db, celebritiesTable } from "@workspace/db";
import { requireAccess, requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

function parseArray(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try { const p = JSON.parse(trimmed); if (Array.isArray(p)) return p; } catch {}
    }
    return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function calculateAge(birthDate: string): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function formatCelebrity(c: typeof celebritiesTable.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone ?? null,
    email: c.email ?? null,
    image: c.photoUrl,
    audiences: parseArray(c.ageGroups),
    interests: parseArray(c.interests),
    dateOfBirth: c.birthDate,
    age: calculateAge(c.birthDate ?? ""),
    tags: parseArray(c.tags),
    priceMin: c.minPrice ? parseFloat(c.minPrice as unknown as string) : null,
    priceMax: c.maxPrice ? parseFloat(c.maxPrice as unknown as string) : null,
    bio: c.bio,
    archivedAt: c.archivedAt,
    createdAt: c.createdAt,
  };
}

function toDbValue(val: unknown): string | null {
  if (val == null) return null;
  if (Array.isArray(val)) return JSON.stringify(val);
  return String(val);
}

router.get("/celebrities", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;

  const celebrities = await db
    .select()
    .from(celebritiesTable)
    .where(isNull(celebritiesTable.archivedAt))
    .orderBy(celebritiesTable.createdAt);

  res.json(celebrities.map(formatCelebrity));
});

router.post("/celebrities", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  try {
    const { name, phone, email, image, audiences, interests, dateOfBirth, tags, priceMin, priceMax, bio } = req.body;

    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }

    const [celebrity] = await db
      .insert(celebritiesTable)
      .values({
        name,
        phone: phone ?? null,
        email: email ?? null,
        photoUrl: image ?? null,
        ageGroups: toDbValue(audiences),
        birthDate: dateOfBirth ?? null,
        interests: toDbValue(interests),
        tags: toDbValue(tags),
        minPrice: priceMin != null ? String(priceMin) : null,
        maxPrice: priceMax != null ? String(priceMax) : null,
        bio: bio ?? null,
      })
      .returning();

    res.status(201).json(formatCelebrity(celebrity));
  } catch (err: any) {
    console.error("celebrities POST error:", err);
    res.status(500).json({ error: err.message ?? "Failed to create celebrity" });
  }
});

router.get("/celebrities/:id", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [celebrity] = await db
    .select()
    .from(celebritiesTable)
    .where(eq(celebritiesTable.id, id));

  if (!celebrity) { res.status(404).json({ error: "Celebrity not found" }); return; }

  res.json(formatCelebrity(celebrity));
});

router.patch("/celebrities/:id", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const existing = await db
    .select()
    .from(celebritiesTable)
    .where(eq(celebritiesTable.id, id));
  if (!existing.length) { res.status(404).json({ error: "Celebrity not found" }); return; }

  const updateData: Record<string, unknown> = {};
  if (req.body.name !== undefined) updateData.name = req.body.name;
  if (req.body.phone !== undefined) updateData.phone = req.body.phone;
  if (req.body.email !== undefined) updateData.email = req.body.email;
  if (req.body.image !== undefined) updateData.photoUrl = req.body.image;
  if (req.body.audiences !== undefined) updateData.ageGroups = toDbValue(req.body.audiences);
  if (req.body.interests !== undefined) updateData.interests = toDbValue(req.body.interests);
  if (req.body.dateOfBirth !== undefined) updateData.birthDate = req.body.dateOfBirth;
  if (req.body.tags !== undefined) updateData.tags = toDbValue(req.body.tags);
  if (req.body.priceMin !== undefined) updateData.minPrice = req.body.priceMin != null ? String(req.body.priceMin) : null;
  if (req.body.priceMax !== undefined) updateData.maxPrice = req.body.priceMax != null ? String(req.body.priceMax) : null;
  if (req.body.bio !== undefined) updateData.bio = req.body.bio;

  if (Object.keys(updateData).length === 0) {
    res.json(formatCelebrity(existing[0]));
    return;
  }

  const [celebrity] = await db
    .update(celebritiesTable)
    .set(updateData)
    .where(eq(celebritiesTable.id, id))
    .returning();

  if (!celebrity) { res.status(404).json({ error: "Celebrity not found" }); return; }
  res.json(formatCelebrity(celebrity));
});

router.delete("/celebrities/:id", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [celebrity] = await db
    .update(celebritiesTable)
    .set({ archivedAt: new Date() } as any)
    .where(eq(celebritiesTable.id, id))
    .returning();

  if (!celebrity) { res.status(404).json({ error: "Celebrity not found" }); return; }
  res.json(formatCelebrity(celebrity));
});

export default router;
