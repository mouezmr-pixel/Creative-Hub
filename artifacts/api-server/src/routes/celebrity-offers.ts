import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, celebrityOffersTable } from "@workspace/db";
import { requireAccess, requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

function formatOffer(o: typeof celebrityOffersTable.$inferSelect) {
  return {
    id: o.id,
    celebrityId: o.celebrityId,
    title: o.title,
    description: o.description ?? null,
    budget: o.budget ? parseFloat(o.budget as unknown as string) : null,
    status: o.status,
    scenario: o.scenario ?? null,
    script: o.script ?? null,
    idea: o.idea ?? null,
    notes: o.notes ?? null,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

router.get("/celebrity-offers", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;

  const celebrityId = req.query.celebrityId ? parseInt(req.query.celebrityId as string, 10) : null;

  let conditions = [];
  if (celebrityId && !isNaN(celebrityId)) conditions.push(eq(celebrityOffersTable.celebrityId, celebrityId));

  const offers = await db
    .select()
    .from(celebrityOffersTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(celebrityOffersTable.createdAt));

  res.json(offers.map(formatOffer));
});

router.post("/celebrity-offers", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const { celebrityId, title, description, budget, notes } = req.body;
  if (!celebrityId) { res.status(400).json({ error: "celebrityId is required" }); return; }
  if (!title) { res.status(400).json({ error: "title is required" }); return; }

  const [offer] = await db
    .insert(celebrityOffersTable)
    .values({
      celebrityId,
      title,
      description: description ?? null,
      budget: budget?.toString() ?? null,
      status: "pending",
      notes: notes ?? null,
    })
    .returning();

  res.status(201).json(formatOffer(offer));
});

router.get("/celebrity-offers/:id", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [offer] = await db
    .select()
    .from(celebrityOffersTable)
    .where(eq(celebrityOffersTable.id, id));

  if (!offer) { res.status(404).json({ error: "Offer not found" }); return; }

  res.json(formatOffer(offer));
});

router.patch("/celebrity-offers/:id", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const existing = await db
    .select()
    .from(celebrityOffersTable)
    .where(eq(celebrityOffersTable.id, id));
  if (!existing.length) { res.status(404).json({ error: "Offer not found" }); return; }

  const updateData: Record<string, unknown> = {};
  if (req.body.title !== undefined) updateData.title = req.body.title;
  if (req.body.description !== undefined) updateData.description = req.body.description;
  if (req.body.budget !== undefined) updateData.budget = req.body.budget?.toString() ?? null;
  if (req.body.status !== undefined) updateData.status = req.body.status;
  if (req.body.scenario !== undefined) updateData.scenario = req.body.scenario;
  if (req.body.script !== undefined) updateData.script = req.body.script;
  if (req.body.idea !== undefined) updateData.idea = req.body.idea;
  if (req.body.notes !== undefined) updateData.notes = req.body.notes;
  updateData.updatedAt = new Date();

  const [offer] = await db
    .update(celebrityOffersTable)
    .set(updateData)
    .where(eq(celebrityOffersTable.id, id))
    .returning();

  if (!offer) { res.status(404).json({ error: "Offer not found" }); return; }
  res.json(formatOffer(offer));
});

router.delete("/celebrity-offers/:id", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(celebrityOffersTable).where(eq(celebrityOffersTable.id, id));
  res.sendStatus(204);
});

export default router;
