import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, workflowTemplatesTable, templateMilestonesTable } from "@workspace/db";
import { requireAccess } from "../middlewares/auth";

const router: IRouter = Router();

function formatMilestone(m: typeof templateMilestonesTable.$inferSelect) {
  return {
    id: m.id,
    templateId: m.templateId,
    title: m.title,
    titleAr: m.titleAr ?? null,
    titleFr: m.titleFr ?? null,
    description: m.description ?? null,
    order: m.order,
    createdAt: m.createdAt.toISOString(),
  };
}

async function getTemplateWithMilestones(templateId: number) {
  const [template] = await db.select().from(workflowTemplatesTable).where(eq(workflowTemplatesTable.id, templateId));
  if (!template) return null;
  const milestones = await db.select().from(templateMilestonesTable)
    .where(eq(templateMilestonesTable.templateId, templateId))
    .orderBy(asc(templateMilestonesTable.order));
  return {
    id: template.id,
    name: template.name,
    description: template.description ?? null,
    milestones: milestones.map(formatMilestone),
    createdAt: template.createdAt.toISOString(),
  };
}

// List all templates (any authenticated user — needed for project create form)
router.get("/workflow-templates", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res))) return;
  const templates = await db.select().from(workflowTemplatesTable).orderBy(asc(workflowTemplatesTable.id));
  const results = await Promise.all(templates.map((t) => getTemplateWithMilestones(t.id)));
  res.json(results.filter(Boolean));
});

// Create template (admin only)
router.post("/workflow-templates", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;
  const { name, description, milestones } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }

  const [template] = await db.insert(workflowTemplatesTable).values({
    name,
    description: description ?? null,
  }).returning();

  if (Array.isArray(milestones) && milestones.length > 0) {
    await db.insert(templateMilestonesTable).values(
      milestones.map((m: any, i: number) => ({
        templateId: template.id,
        title: m.title,
        titleAr: m.titleAr ?? null,
        titleFr: m.titleFr ?? null,
        description: m.description ?? null,
        order: m.order ?? i,
      }))
    );
  }

  const result = await getTemplateWithMilestones(template.id);
  res.status(201).json(result);
});

// Update template name/description
router.patch("/workflow-templates/:id", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;
  const id = parseInt(req.params.id, 10);
  const { name, description } = req.body;
  const updateData: any = {};
  if (name != null) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  await db.update(workflowTemplatesTable).set(updateData).where(eq(workflowTemplatesTable.id, id));
  const result = await getTemplateWithMilestones(id);
  if (!result) { res.status(404).json({ error: "Template not found" }); return; }
  res.json(result);
});

// Delete template + its milestones
router.delete("/workflow-templates/:id", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;
  const id = parseInt(req.params.id, 10);
  await db.delete(templateMilestonesTable).where(eq(templateMilestonesTable.templateId, id));
  await db.delete(workflowTemplatesTable).where(eq(workflowTemplatesTable.id, id));
  res.sendStatus(204);
});

// Add milestone to template
router.post("/workflow-templates/:id/milestones", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;
  const templateId = parseInt(req.params.id, 10);
  const { title, titleAr, titleFr, description, order } = req.body;
  if (!title) { res.status(400).json({ error: "title is required" }); return; }

  const existing = await db.select().from(templateMilestonesTable)
    .where(eq(templateMilestonesTable.templateId, templateId));

  const [milestone] = await db.insert(templateMilestonesTable).values({
    templateId,
    title,
    titleAr: titleAr ?? null,
    titleFr: titleFr ?? null,
    description: description ?? null,
    order: order ?? existing.length,
  }).returning();

  res.status(201).json(formatMilestone(milestone));
});

// Update template milestone
router.patch("/workflow-templates/:id/milestones/:milestoneId", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;
  const milestoneId = parseInt(req.params.milestoneId, 10);
  const { title, titleAr, titleFr, description, order } = req.body;
  const updateData: any = {};
  if (title != null) updateData.title = title;
  if (titleAr !== undefined) updateData.titleAr = titleAr;
  if (titleFr !== undefined) updateData.titleFr = titleFr;
  if (description !== undefined) updateData.description = description;
  if (order != null) updateData.order = order;
  const [milestone] = await db.update(templateMilestonesTable).set(updateData)
    .where(eq(templateMilestonesTable.id, milestoneId)).returning();
  if (!milestone) { res.status(404).json({ error: "Milestone not found" }); return; }
  res.json(formatMilestone(milestone));
});

// Delete template milestone
router.delete("/workflow-templates/:id/milestones/:milestoneId", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;
  const milestoneId = parseInt(req.params.milestoneId, 10);
  await db.delete(templateMilestonesTable).where(eq(templateMilestonesTable.id, milestoneId));
  res.sendStatus(204);
});

export default router;
