import { Router, type IRouter } from "express";
import { eq, and, isNull } from "drizzle-orm";
import { db, celebritiesTable, celebrityOffersTable } from "@workspace/db";
import { requireAccess } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/celebrity-portal/offers", async (req, res): Promise<void> => {
  const user = await requireAccess(req, res, { allowedRoles: ["celebrity"] });
  if (!user) return;

  const [celebrity] = await db
    .select({ id: celebritiesTable.id })
    .from(celebritiesTable)
    .where(
      and(
        eq(celebritiesTable.userId, user.id),
        isNull(celebritiesTable.archivedAt),
      ),
    );

  if (!celebrity) {
    res.status(404).json({ error: "Celebrity profile not found" });
    return;
  }

  const offers = await db
    .select()
    .from(celebrityOffersTable)
    .where(eq(celebrityOffersTable.celebrityId, celebrity.id))
    .orderBy(celebrityOffersTable.createdAt);

  res.json(
    offers.map((o) => ({
      id: o.id,
      title: o.title,
      description: o.description,
      budget: o.budget ? parseFloat(o.budget as unknown as string) : null,
      status: o.status,
      scenario: o.scenario,
      script: o.script,
      idea: o.idea,
      notes: o.notes,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    })),
  );
});

export default router;
