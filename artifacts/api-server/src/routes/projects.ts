import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, projectsTable, usersTable, projectAssigneesTable } from "@workspace/db";
import {
  CreateProjectBody,
  GetProjectParams,
  UpdateProjectBody,
  UpdateProjectParams,
  DeleteProjectParams,
  ListProjectsQueryParams,
} from "@workspace/api-zod";
import { getSessionUser, buildProjectScopeConditions, requireProjectAccess } from "../middlewares/auth";
import { maskFinancials, getClientCanViewFinancials } from "../services/projects/project-financials";
import { formatProject, formatProjectsBatch } from "../services/projects/project-presenter";
import { syncAssignees } from "../services/projects/project-assignment";
import { createCommissionExpensesForCompletedProject } from "../services/projects/project-accounting";

const router: IRouter = Router();

router.get("/projects", async (req, res): Promise<void> => {
  const scope = await buildProjectScopeConditions(req, res);
  if (!scope) return;
  const { user, conditions } = scope;

  const qp = ListProjectsQueryParams.safeParse(req.query);
  if (qp.success) {
    if (qp.data.status != null) {
      conditions.push(eq(projectsTable.status, qp.data.status));
    }
    if (qp.data.photographerId != null) {
      conditions.push(eq(projectsTable.photographerId, qp.data.photographerId));
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const projects = await db
    .select()
    .from(projectsTable)
    .where(whereClause)
    .orderBy(projectsTable.createdAt);

  let formatted: Record<string, unknown>[] = await formatProjectsBatch(projects);

  if (qp.success && qp.data.hasDebt === "true") {
    formatted = formatted.filter((p) => ((p.remainingDebt as number) ?? 0) > 0);
  }

  if (user.role === "client") {
    const canSeeFinancials = await getClientCanViewFinancials(user.id);
    if (!canSeeFinancials) {
      formatted = formatted.map(maskFinancials);
    }
  }

  if (user.role === "photographer") {
    formatted = formatted.map(maskFinancials);
  }

  res.json(formatted);
});

router.post("/projects", async (req, res): Promise<void> => {
  const user = await getSessionUser(req, res);
  if (!user) return;

  // Clients and photographers cannot create projects via API
  if (user.role === "client" || user.role === "photographer") {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  // Coerce numeric cost fields — HTML inputs always send strings
  const rawBody = { ...req.body };
  for (const field of ["expectedCost", "finalCost", "amountPaid"]) {
    if (rawBody[field] != null && rawBody[field] !== "") rawBody[field] = Number(rawBody[field]);
    else if (rawBody[field] === "") delete rawBody[field];
  }
  const parsed = CreateProjectBody.safeParse(rawBody);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const assigneeIds: number[] = (parsed.data as any).assigneeIds ?? [];

  // Determine primary photographerId
  let primaryPhotographerId = parsed.data.photographerId ?? null;
  if (!primaryPhotographerId && assigneeIds.length > 0) {
    const firstAssignee = await db
      .select({ id: usersTable.id, role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, assigneeIds[0]));
    if (firstAssignee[0]) primaryPhotographerId = firstAssignee[0].id;
  }

  const insertData: any = {
    title: parsed.data.title,
    clientId: parsed.data.clientId,
    photographerId: primaryPhotographerId,
    serviceId: parsed.data.serviceId ?? null,
    status: parsed.data.status ?? "pending",
    progress: parsed.data.progress ?? 0,
    startDate: parsed.data.startDate,
    deliveryDate: parsed.data.deliveryDate,
    weTransferLink: parsed.data.weTransferLink,
    expectedCost: parsed.data.expectedCost?.toString(),
    finalCost: parsed.data.finalCost?.toString(),
    amountPaid: parsed.data.amountPaid?.toString(),
    discount: parsed.data.discount?.toString(),
    currency: parsed.data.currency ?? "DZD",
    originalClientIdea: parsed.data.originalClientIdea ?? null,
    aiGeneratedSuggestion: parsed.data.aiGeneratedSuggestion ?? null,
    finalProposedIdea: parsed.data.finalProposedIdea ?? null,
  };

  const [project] = await db.insert(projectsTable).values(insertData).returning();

  if (assigneeIds.length > 0) {
    const commissions = parsed.data.assigneeCommissions as Record<number, { commissionType: string; commissionValue: number | null }> | undefined;
    await syncAssignees(project.id, assigneeIds, commissions);
  }

  const formatted = await formatProject(project);
  res.status(201).json(formatted);
});

router.get("/projects/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetProjectParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const project = await requireProjectAccess(req, res, params.data.id);
  if (!project) return;
  let formatted: Record<string, unknown> = await formatProject(project);

  const user = await getSessionUser(req, res);
  if (user && user.role === "client") {
    const canSeeFinancials = await getClientCanViewFinancials(user.id);
    if (!canSeeFinancials) {
      formatted = maskFinancials(formatted);
    }
  }

  if (user && user.role === "photographer") {
    formatted = maskFinancials(formatted);
  }

  res.json(formatted);
});

router.patch("/projects/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateProjectParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // Verify access before allowing update
  const accessCheck = await requireProjectAccess(req, res, params.data.id);
  if (!accessCheck) return;

  // Clients and photographers cannot mutate projects
  const user = await getSessionUser(req, res);
  if (!user) return;
  if (user.role === "client" || user.role === "photographer") {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // If status is transitioning to "completed", fetch old project to detect transition
  let wasJustCompleted = false;
  let oldProject: typeof projectsTable.$inferSelect | undefined;
  if (parsed.data.status === "completed") {
    [oldProject] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, params.data.id));
    wasJustCompleted = oldProject != null && oldProject.status !== "completed";
  }

  const updateData: Partial<typeof projectsTable.$inferInsert> = {};
  if (parsed.data.title != null) updateData.title = parsed.data.title;
  if (parsed.data.status != null) updateData.status = parsed.data.status;
  if (parsed.data.progress != null) updateData.progress = parsed.data.progress;
  if (wasJustCompleted) updateData.progress = 100;
  if (wasJustCompleted) updateData.completedAt = new Date();
  if ("startDate" in parsed.data) updateData.startDate = parsed.data.startDate;
  if ("deliveryDate" in parsed.data) updateData.deliveryDate = parsed.data.deliveryDate;
  if ("weTransferLink" in parsed.data) updateData.weTransferLink = parsed.data.weTransferLink;
  if ("expectedCost" in parsed.data) updateData.expectedCost = parsed.data.expectedCost?.toString();
  if ("finalCost" in parsed.data) updateData.finalCost = parsed.data.finalCost?.toString();
  if ("amountPaid" in parsed.data) updateData.amountPaid = parsed.data.amountPaid?.toString();
  if ("discount" in parsed.data) updateData.discount = parsed.data.discount?.toString();
  if ("currency" in parsed.data && parsed.data.currency) updateData.currency = parsed.data.currency;
  if ("serviceId" in parsed.data) updateData.serviceId = parsed.data.serviceId ?? null;
  if ("photographerId" in parsed.data) updateData.photographerId = parsed.data.photographerId;
  if ("originalClientIdea" in parsed.data) updateData.originalClientIdea = parsed.data.originalClientIdea;
  if ("aiGeneratedSuggestion" in parsed.data) updateData.aiGeneratedSuggestion = parsed.data.aiGeneratedSuggestion;
  if ("finalProposedIdea" in parsed.data) updateData.finalProposedIdea = parsed.data.finalProposedIdea;

  const assigneeIds: number[] | undefined = parsed.data.assigneeIds;

  let project: typeof projectsTable.$inferSelect | undefined;

  if (Object.keys(updateData).length > 0) {
    const [updated] = await db
      .update(projectsTable)
      .set(updateData)
      .where(eq(projectsTable.id, params.data.id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    project = updated;
  } else {
    const [existing] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, params.data.id));
    if (!existing) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    project = existing;
  }

  if (assigneeIds !== undefined) {
    const commissions = parsed.data.assigneeCommissions as Record<number, { commissionType: string; commissionValue: number | null }> | undefined;
    await syncAssignees(project.id, assigneeIds, commissions);
  }

  // Auto-record commission expenses when a project is completed
  if (wasJustCompleted) {
    await createCommissionExpensesForCompletedProject(project);
  }

  const formatted = await formatProject(project);
  res.json(formatted);
});

router.post("/projects/:id/invoice", async (req, res): Promise<void> => {
  const user = await getSessionUser(req, res);
  if (!user) return;

  // Only admin or users with canInvoice permission
  if (user.role !== "admin" && !user.canInvoice) {
    res.status(403).json({ error: "Invoice permission required" });
    return;
  }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const type = req.body.type as "proforma" | "final";
  if (type !== "proforma" && type !== "final") {
    res.status(400).json({ error: "type must be 'proforma' or 'final'" });
    return;
  }

  const updateData: any = {};
  if (type === "proforma") updateData.proforma_issued_at = new Date();
  if (type === "final") updateData.final_invoice_issued_at = new Date();

  const [updated] = await db
    .update(projectsTable)
    .set(updateData)
    .where(eq(projectsTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Project not found" }); return; }
  const formatted = await formatProject(updated);
  res.json(formatted);
});

// PATCH /projects/:projectId/assignees/:userId — update commission for a specific assignee
router.patch("/projects/:projectId/assignees/:userId", async (req, res): Promise<void> => {
  const user = await getSessionUser(req, res);
  if (!user) return;
  if (user.role !== "admin" && !user.canManageAllProjects) {
    res.status(403).json({ error: "Admin or canManageAllProjects required" });
    return;
  }

  const projectId = parseInt(req.params.projectId, 10);
  const userId = parseInt(req.params.userId, 10);
  if (isNaN(projectId) || isNaN(userId)) {
    res.status(400).json({ error: "Invalid project or user id" });
    return;
  }

  const { commissionType, commissionValue } = req.body ?? {};
  if (commissionType != null && !["percentage", "fixed"].includes(commissionType)) {
    res.status(400).json({ error: "commissionType must be 'percentage' or 'fixed'" });
    return;
  }

  const [existing] = await db
    .select()
    .from(projectAssigneesTable)
    .where(
      and(
        eq(projectAssigneesTable.projectId, projectId),
        eq(projectAssigneesTable.userId, userId)
      )
    );

  if (!existing) {
    res.status(404).json({ error: "Assignee not found for this project" });
    return;
  }

  const updateData: Record<string, any> = {};
  if (commissionType != null) updateData.commissionType = commissionType;
  if (commissionValue !== undefined) updateData.commissionValue = commissionValue != null ? String(commissionValue) : null;

  if (Object.keys(updateData).length > 0) {
    await db
      .update(projectAssigneesTable)
      .set(updateData)
      .where(
        and(
          eq(projectAssigneesTable.projectId, projectId),
          eq(projectAssigneesTable.userId, userId)
        )
      );
  }

  const [updated] = await db
    .select({
      userId: projectAssigneesTable.userId,
      projectId: projectAssigneesTable.projectId,
      commissionType: projectAssigneesTable.commissionType,
      commissionValue: projectAssigneesTable.commissionValue,
    })
    .from(projectAssigneesTable)
    .where(
      and(
        eq(projectAssigneesTable.projectId, projectId),
        eq(projectAssigneesTable.userId, userId)
      )
    );

  res.json(updated ? {
    ...updated,
    commissionValue: updated.commissionValue ? parseFloat(updated.commissionValue as string) : null,
  } : null);
});

// DELETE /projects/:projectId/assignees/:userId — remove a creative from a project
router.delete("/projects/:projectId/assignees/:userId", async (req, res): Promise<void> => {
  const user = await getSessionUser(req, res);
  if (!user) return;
  if (user.role !== "admin" && !user.canManageAllProjects) {
    res.status(403).json({ error: "Admin or canManageAllProjects required" });
    return;
  }

  const projectId = parseInt(req.params.projectId, 10);
  const userId = parseInt(req.params.userId, 10);
  if (isNaN(projectId) || isNaN(userId)) {
    res.status(400).json({ error: "Invalid project or user id" });
    return;
  }

  const [existing] = await db
    .select()
    .from(projectAssigneesTable)
    .where(
      and(
        eq(projectAssigneesTable.projectId, projectId),
        eq(projectAssigneesTable.userId, userId)
      )
    );

  if (!existing) {
    res.status(404).json({ error: "Assignee not found for this project" });
    return;
  }

  await db
    .delete(projectAssigneesTable)
    .where(
      and(
        eq(projectAssigneesTable.projectId, projectId),
        eq(projectAssigneesTable.userId, userId)
      )
    );

  // If this user was the primary photographer, unset it
  const [project] = await db
    .select({ photographerId: projectsTable.photographerId })
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));

  if (project && project.photographerId === userId) {
    await db
      .update(projectsTable)
      .set({ photographerId: null })
      .where(eq(projectsTable.id, projectId));
  }

  res.json({ ok: true });
});

router.delete("/projects/:id", async (req, res): Promise<void> => {
  const user = await getSessionUser(req, res);
  if (!user) return;

  // Only admin can delete projects
  if (user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteProjectParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(projectAssigneesTable).where(eq(projectAssigneesTable.projectId, params.data.id));
  await db.delete(projectsTable).where(eq(projectsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
