import { Router, type IRouter } from "express";
import { eq, asc, and } from "drizzle-orm";
import {
  db,
  campaignsTable,
  campaignServicesTable,
  campaignMilestonesTable,
  clientsTable,
} from "@workspace/db";
import { requireAccess } from "../middlewares/auth";

const router: IRouter = Router();

function formatCampaign(c: typeof campaignsTable.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    nameAr: c.nameAr ?? null,
    nameFr: c.nameFr ?? null,
    description: c.description ?? null,
    descriptionAr: c.descriptionAr ?? null,
    descriptionFr: c.descriptionFr ?? null,
    type: c.type,
    status: c.status,
    clientId: c.clientId ?? null,
    budget: c.budget ? parseFloat(c.budget as unknown as string) : null,
    startDate: c.startDate?.toISOString() ?? null,
    endDate: c.endDate?.toISOString() ?? null,
    coverImage: c.coverImage ?? null,
    proposalContent: c.proposalContent ?? null,
    proposalContentAr: c.proposalContentAr ?? null,
    proposalContentFr: c.proposalContentFr ?? null,
    shared: c.shared,
    sharedAt: c.sharedAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

function formatMilestone(m: typeof campaignMilestonesTable.$inferSelect) {
  return {
    id: m.id,
    campaignId: m.campaignId,
    title: m.title,
    titleAr: m.titleAr ?? null,
    titleFr: m.titleFr ?? null,
    description: m.description ?? null,
    order: m.order,
    dueDate: m.dueDate?.toISOString() ?? null,
    isCompleted: m.isCompleted,
    completedAt: m.completedAt?.toISOString() ?? null,
    createdAt: m.createdAt.toISOString(),
  };
}

// --- Campaigns CRUD ---

router.get("/campaigns", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;

  const { status, clientId } = req.query;
  let conditions = [];
  if (status && typeof status === "string") conditions.push(eq(campaignsTable.status, status));
  if (clientId && typeof clientId === "string") conditions.push(eq(campaignsTable.clientId, parseInt(clientId, 10)));

  const campaigns = await db
    .select()
    .from(campaignsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(campaignsTable.createdAt);

  // Attach client name
  const result = await Promise.all(
    campaigns.map(async (c) => {
      let clientName: string | null = null;
      if (c.clientId) {
        const [cl] = await db
          .select({ name: clientsTable.name })
          .from(clientsTable)
          .where(eq(clientsTable.id, c.clientId));
        clientName = cl?.name ?? null;
      }
      return { ...formatCampaign(c), clientName };
    }),
  );

  res.json(result);
});

router.get("/campaigns/:id", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
  if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }

  let clientName: string | null = null;
  if (campaign.clientId) {
    const [cl] = await db
      .select({ name: clientsTable.name })
      .from(clientsTable)
      .where(eq(clientsTable.id, campaign.clientId));
    clientName = cl?.name ?? null;
  }

  const services = await db
    .select()
    .from(campaignServicesTable)
    .where(eq(campaignServicesTable.campaignId, id));

  const milestones = await db
    .select()
    .from(campaignMilestonesTable)
    .where(eq(campaignMilestonesTable.campaignId, id))
    .orderBy(asc(campaignMilestonesTable.order));

  res.json({
    ...formatCampaign(campaign),
    clientName,
    services: services.map((s) => ({
      id: s.id,
      serviceId: s.serviceId,
      customPrice: s.customPrice ? parseFloat(s.customPrice as unknown as string) : null,
      notes: s.notes ?? null,
    })),
    milestones: milestones.map(formatMilestone),
  });
});

router.post("/campaigns", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;

  const { name, nameAr, nameFr, description, descriptionAr, descriptionFr, type, status, clientId, budget, startDate, endDate, coverImage, proposalContent, proposalContentAr, proposalContentFr } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }

  const [campaign] = await db
    .insert(campaignsTable)
    .values({
      name,
      nameAr: nameAr ?? null,
      nameFr: nameFr ?? null,
      description: description ?? null,
      descriptionAr: descriptionAr ?? null,
      descriptionFr: descriptionFr ?? null,
      type: type ?? "other",
      status: status ?? "draft",
      clientId: clientId ?? null,
      budget: budget?.toString() ?? null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      coverImage: coverImage ?? null,
      proposalContent: proposalContent ?? null,
      proposalContentAr: proposalContentAr ?? null,
      proposalContentFr: proposalContentFr ?? null,
    })
    .returning();

  res.status(201).json(formatCampaign(campaign));
});

router.patch("/campaigns/:id", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const existing = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
  if (!existing.length) { res.status(404).json({ error: "Campaign not found" }); return; }

  const updateData: Partial<typeof campaignsTable.$inferInsert> = {};
  const fields = ["name", "nameAr", "nameFr", "description", "descriptionAr", "descriptionFr", "type", "status", "clientId", "coverImage", "proposalContent", "proposalContentAr", "proposalContentFr", "shared"] as const;
  for (const f of fields) {
    if (req.body[f] !== undefined) (updateData as any)[f] = req.body[f];
  }
  if (req.body.budget !== undefined) updateData.budget = req.body.budget?.toString() ?? null;
  if (req.body.startDate !== undefined) updateData.startDate = req.body.startDate ? new Date(req.body.startDate) : null;
  if (req.body.endDate !== undefined) updateData.endDate = req.body.endDate ? new Date(req.body.endDate) : null;
  if (req.body.shared === true && !existing[0].sharedAt) updateData.sharedAt = new Date();
  if (req.body.shared === false) updateData.sharedAt = null;

  updateData.updatedAt = new Date();

  const [campaign] = await db.update(campaignsTable).set(updateData).where(eq(campaignsTable.id, id)).returning();
  res.json(formatCampaign(campaign));
});

router.delete("/campaigns/:id", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(campaignsTable).where(eq(campaignsTable.id, id));
  res.sendStatus(204);
});

// --- Share / Unshare ---

router.post("/campaigns/:id/share", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [campaign] = await db
    .update(campaignsTable)
    .set({ shared: true, sharedAt: new Date(), updatedAt: new Date() })
    .where(eq(campaignsTable.id, id))
    .returning();
  if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }

  res.json(formatCampaign(campaign));
});

router.post("/campaigns/:id/unshare", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [campaign] = await db
    .update(campaignsTable)
    .set({ shared: false, sharedAt: null, updatedAt: new Date() })
    .where(eq(campaignsTable.id, id))
    .returning();
  if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }

  res.json(formatCampaign(campaign));
});

// --- Client-facing: list shared campaigns ---

router.get("/client/campaigns", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["client"] }))) return;

  const user = res.locals.user;
  const [clientRecord] = await db
    .select({ id: clientsTable.id })
    .from(clientsTable)
    .where(eq(clientsTable.userId, user.id));

  if (!clientRecord) { res.json([]); return; }

  const campaigns = await db
    .select()
    .from(campaignsTable)
    .where(and(eq(campaignsTable.clientId, clientRecord.id), eq(campaignsTable.shared, true)))
    .orderBy(campaignsTable.createdAt);

  const result = await Promise.all(
    campaigns.map(async (c) => {
      const services = await db
        .select()
        .from(campaignServicesTable)
        .where(eq(campaignServicesTable.campaignId, c.id));
      const milestones = await db
        .select()
        .from(campaignMilestonesTable)
        .where(eq(campaignMilestonesTable.campaignId, c.id))
        .orderBy(asc(campaignMilestonesTable.order));
      return {
        ...formatCampaign(c),
        services: services.map((s) => ({
          id: s.id,
          serviceId: s.serviceId,
          customPrice: s.customPrice ? parseFloat(s.customPrice as unknown as string) : null,
          notes: s.notes ?? null,
        })),
        milestones: milestones.map(formatMilestone),
      };
    }),
  );

  res.json(result);
});

// --- Campaign Services ---

router.get("/campaigns/:id/services", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;
  const campaignId = parseInt(req.params.id, 10);
  if (isNaN(campaignId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const services = await db
    .select()
    .from(campaignServicesTable)
    .where(eq(campaignServicesTable.campaignId, campaignId));
  res.json(services.map((s) => ({
    id: s.id,
    campaignId: s.campaignId,
    serviceId: s.serviceId,
    customPrice: s.customPrice ? parseFloat(s.customPrice as unknown as string) : null,
    notes: s.notes ?? null,
  })));
});

router.post("/campaigns/:id/services", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;
  const campaignId = parseInt(req.params.id, 10);
  if (isNaN(campaignId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { serviceId, customPrice, notes } = req.body;
  if (!serviceId) { res.status(400).json({ error: "serviceId is required" }); return; }

  const [svc] = await db.insert(campaignServicesTable).values({
    campaignId,
    serviceId,
    customPrice: customPrice?.toString() ?? null,
    notes: notes ?? null,
  }).returning();

  res.status(201).json({
    id: svc.id,
    campaignId: svc.campaignId,
    serviceId: svc.serviceId,
    customPrice: svc.customPrice ? parseFloat(svc.customPrice as unknown as string) : null,
    notes: svc.notes ?? null,
  });
});

router.delete("/campaigns/:id/services/:serviceId", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;
  const campaignId = parseInt(req.params.id, 10);
  const serviceId = parseInt(req.params.serviceId, 10);
  if (isNaN(campaignId) || isNaN(serviceId)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(campaignServicesTable).where(
    and(eq(campaignServicesTable.campaignId, campaignId), eq(campaignServicesTable.id, serviceId)),
  );
  res.sendStatus(204);
});

// --- Campaign Milestones ---

router.get("/campaigns/:id/milestones", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;
  const campaignId = parseInt(req.params.id, 10);
  if (isNaN(campaignId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const milestones = await db
    .select()
    .from(campaignMilestonesTable)
    .where(eq(campaignMilestonesTable.campaignId, campaignId))
    .orderBy(asc(campaignMilestonesTable.order));
  res.json(milestones.map(formatMilestone));
});

router.post("/campaigns/:id/milestones", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;
  const campaignId = parseInt(req.params.id, 10);
  if (isNaN(campaignId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { title, titleAr, titleFr, description, order, dueDate } = req.body;
  if (!title) { res.status(400).json({ error: "title is required" }); return; }

  const existing = await db
    .select()
    .from(campaignMilestonesTable)
    .where(eq(campaignMilestonesTable.campaignId, campaignId));

  const [milestone] = await db.insert(campaignMilestonesTable).values({
    campaignId,
    title,
    titleAr: titleAr ?? null,
    titleFr: titleFr ?? null,
    description: description ?? null,
    order: order ?? existing.length,
    dueDate: dueDate ? new Date(dueDate) : null,
    isCompleted: false,
  }).returning();

  res.status(201).json(formatMilestone(milestone));
});

router.patch("/campaigns/:id/milestones/:milestoneId", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;
  const campaignId = parseInt(req.params.id, 10);
  const milestoneId = parseInt(req.params.milestoneId, 10);
  if (isNaN(campaignId) || isNaN(milestoneId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const updateData: Partial<typeof campaignMilestonesTable.$inferInsert> = {};
  const fields = ["title", "titleAr", "titleFr", "description", "isCompleted"] as const;
  for (const f of fields) {
    if (req.body[f] !== undefined) (updateData as any)[f] = req.body[f];
  }
  if (req.body.dueDate !== undefined) updateData.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
  if (req.body.order !== undefined) updateData.order = req.body.order;
  if (req.body.isCompleted === true) updateData.completedAt = new Date();
  if (req.body.isCompleted === false) updateData.completedAt = null;

  const [milestone] = await db
    .update(campaignMilestonesTable)
    .set(updateData)
    .where(and(eq(campaignMilestonesTable.campaignId, campaignId), eq(campaignMilestonesTable.id, milestoneId)))
    .returning();
  if (!milestone) { res.status(404).json({ error: "Milestone not found" }); return; }

  res.json(formatMilestone(milestone));
});

router.delete("/campaigns/:id/milestones/:milestoneId", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;
  const campaignId = parseInt(req.params.id, 10);
  const milestoneId = parseInt(req.params.milestoneId, 10);
  if (isNaN(campaignId) || isNaN(milestoneId)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(campaignMilestonesTable).where(
    and(eq(campaignMilestonesTable.campaignId, campaignId), eq(campaignMilestonesTable.id, milestoneId)),
  );
  res.sendStatus(204);
});

export default router;
