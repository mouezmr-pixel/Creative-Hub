import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, projectMilestonesTable, projectsTable, usersTable } from "@workspace/db";
import { getSessionUser, requireProjectAccess } from "../middlewares/auth";

const router: IRouter = Router();

function formatMilestone(m: typeof projectMilestonesTable.$inferSelect) {
  return {
    id: m.id,
    projectId: m.projectId,
    title: m.title,
    titleAr: m.titleAr ?? null,
    titleFr: m.titleFr ?? null,
    description: m.description ?? null,
    order: m.order,
    isCompleted: m.isCompleted,
    completedAt: m.completedAt?.toISOString() ?? null,
    createdAt: m.createdAt.toISOString(),
  };
}

async function recalcProgress(projectId: number) {
  const milestones = await db.select().from(projectMilestonesTable)
    .where(eq(projectMilestonesTable.projectId, projectId));
  if (milestones.length === 0) return;
  const completed = milestones.filter((m) => m.isCompleted).length;
  const progress = Math.round((completed / milestones.length) * 100);
  await db.update(projectsTable).set({ progress }).where(eq(projectsTable.id, projectId));
}

// List milestones for a project — ownership check
router.get("/projects/:id/milestones", async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.id, 10);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid project id" }); return; }

  const project = await requireProjectAccess(req, res, projectId);
  if (!project) return;

  const milestones = await db.select().from(projectMilestonesTable)
    .where(eq(projectMilestonesTable.projectId, projectId))
    .orderBy(asc(projectMilestonesTable.order));
  res.json(milestones.map(formatMilestone));
});

// Add milestone to project
router.post("/projects/:id/milestones", async (req, res): Promise<void> => {
  const user = await getSessionUser(req, res);
  if (!user) return;

  if (user.role === "client") {
    res.status(403).json({ error: "Access denied" }); return;
  }

  const projectId = parseInt(req.params.id, 10);
  const { title, titleAr, titleFr, description, order } = req.body;
  if (!title) { res.status(400).json({ error: "title is required" }); return; }

  const existing = await db.select().from(projectMilestonesTable)
    .where(eq(projectMilestonesTable.projectId, projectId));

  const [milestone] = await db.insert(projectMilestonesTable).values({
    projectId,
    title,
    titleAr: titleAr ?? null,
    titleFr: titleFr ?? null,
    description: description ?? null,
    order: order ?? existing.length,
    isCompleted: false,
  }).returning();

  await recalcProgress(projectId);
  res.status(201).json(formatMilestone(milestone));
});

// Bulk-create milestones (from template)
router.post("/projects/:id/milestones/bulk", async (req, res): Promise<void> => {
  const user = await getSessionUser(req, res);
  if (!user) return;

  if (user.role === "client") {
    res.status(403).json({ error: "Access denied" }); return;
  }

  const projectId = parseInt(req.params.id, 10);
  const { milestones } = req.body;

  if (!Array.isArray(milestones) || milestones.length === 0) {
    res.status(400).json({ error: "milestones array is required" }); return;
  }

  await db.delete(projectMilestonesTable).where(eq(projectMilestonesTable.projectId, projectId));

  const rows = await db.insert(projectMilestonesTable).values(
    milestones.map((m: any, i: number) => ({
      projectId,
      title: m.title,
      titleAr: m.titleAr ?? null,
      titleFr: m.titleFr ?? null,
      description: m.description ?? null,
      order: m.order ?? i,
      isCompleted: false,
    }))
  ).returning();

  await recalcProgress(projectId);
  res.status(201).json(rows.map(formatMilestone));
});

// Update a project milestone
router.patch("/projects/:id/milestones/:milestoneId", async (req, res): Promise<void> => {
  const user = await getSessionUser(req, res);
  if (!user) return;

  if (user.role === "client") {
    res.status(403).json({ error: "Access denied" }); return;
  }

  const projectId = parseInt(req.params.id, 10);
  const milestoneId = parseInt(req.params.milestoneId, 10);
  const { title, titleAr, titleFr, description, order, isCompleted } = req.body;

  const updateData: Partial<typeof projectMilestonesTable.$inferInsert> = {};
  if (title != null) updateData.title = title;
  if (titleAr !== undefined) updateData.titleAr = titleAr;
  if (titleFr !== undefined) updateData.titleFr = titleFr;
  if (description !== undefined) updateData.description = description;
  if (order != null) updateData.order = order;
  if (isCompleted != null) {
    updateData.isCompleted = isCompleted;
    updateData.completedAt = isCompleted ? new Date() : null;
  }

  const [milestone] = await db.update(projectMilestonesTable)
    .set(updateData)
    .where(eq(projectMilestonesTable.id, milestoneId))
    .returning();

  if (!milestone) { res.status(404).json({ error: "Milestone not found" }); return; }

  await recalcProgress(projectId);
  res.json(formatMilestone(milestone));
});

// Delete a project milestone
router.delete("/projects/:id/milestones/:milestoneId", async (req, res): Promise<void> => {
  const user = await getSessionUser(req, res);
  if (!user) return;

  if (user.role === "client") {
    res.status(403).json({ error: "Access denied" }); return;
  }

  const projectId = parseInt(req.params.id, 10);
  const milestoneId = parseInt(req.params.milestoneId, 10);
  await db.delete(projectMilestonesTable).where(eq(projectMilestonesTable.id, milestoneId));
  await recalcProgress(projectId);
  res.sendStatus(204);
});

export default router;
