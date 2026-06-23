import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, projectsTable, clientsTable, usersTable, projectAssigneesTable, servicesTable, expensesTable } from "@workspace/db";
import { format } from "date-fns";
import {
  CreateProjectBody,
  GetProjectParams,
  UpdateProjectBody,
  UpdateProjectParams,
  DeleteProjectParams,
  ListProjectsQueryParams,
} from "@workspace/api-zod";
import { getSessionUser, buildProjectScopeConditions, requireProjectAccess } from "../middlewares/auth";

const router: IRouter = Router();

function computeDebt(project: typeof projectsTable.$inferSelect): number {
  const finalCost = project.finalCost ? parseFloat(project.finalCost as unknown as string) : 0;
  const discount = project.discount ? parseFloat(project.discount as unknown as string) : 0;
  const amountPaid = project.amountPaid ? parseFloat(project.amountPaid as unknown as string) : 0;
  return Math.max(0, finalCost - discount - amountPaid);
}

async function getAssignees(projectId: number) {
  const rows = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      profession: usersTable.profession,
      role: usersTable.role,
      paymentType: sql<string>`${usersTable}.payment_type`,
      commissionType: sql<string | null>`${projectAssigneesTable}.commission_type`,
      commissionValue: sql<string | null>`${projectAssigneesTable}.commission_value`,
    })
    .from(projectAssigneesTable)
    .innerJoin(usersTable, eq(projectAssigneesTable.userId, usersTable.id))
    .where(eq(projectAssigneesTable.projectId, projectId));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    profession: r.profession ?? null,
    role: r.role,
    paymentType: (r.paymentType ?? "per_project") as string,
    commissionType: (r.commissionType ?? null) as string | null,
    commissionValue: r.commissionValue != null ? parseFloat(r.commissionValue as string) : null,
  }));
}

async function syncAssignees(
  projectId: number,
  assigneeIds: number[],
  commissions?: Record<number, { commissionType: string; commissionValue: number | null }>
) {
  await db.delete(projectAssigneesTable).where(eq(projectAssigneesTable.projectId, projectId));
  if (assigneeIds.length > 0) {
    await db.insert(projectAssigneesTable).values(
      assigneeIds.map((userId) => {
        const comm = commissions?.[userId];
        return {
          projectId,
          userId,
          commissionType: comm?.commissionType ?? null,
          commissionValue: comm?.commissionValue != null ? String(comm.commissionValue) : null,
        };
      })
    );
  }
  return getAssignees(projectId);
}

async function getClientCanViewFinancials(userId: number): Promise<boolean> {
  const [row] = await db
    .select({ canViewFinancials: clientsTable.canViewFinancials })
    .from(clientsTable)
    .where(eq(clientsTable.userId, userId));
  return row?.canViewFinancials ?? false;
}

function maskFinancials(p: Record<string, unknown>): Record<string, unknown> {
  return { ...p, finalCost: null, amountPaid: null, discount: null, remainingDebt: null };
}

async function formatProject(project: typeof projectsTable.$inferSelect) {
  let clientName: string | null = null;
  let photographerName: string | null = null;
  let serviceName: string | null = null;

  if (project.clientId) {
    const [client] = await db
      .select({ name: clientsTable.name })
      .from(clientsTable)
      .where(eq(clientsTable.id, project.clientId));
    clientName = client?.name ?? null;
  }

  if (project.photographerId) {
    const [photographer] = await db
      .select({ name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, project.photographerId));
    photographerName = photographer?.name ?? null;
  }

  const serviceId = project.serviceId ?? null;
  if (serviceId) {
    const [svc] = await db.select({ title: servicesTable.title }).from(servicesTable).where(eq(servicesTable.id, serviceId));
    serviceName = svc?.title ?? null;
  }

  const assignees = await getAssignees(project.id);

  const expectedCost = project.expectedCost ? parseFloat(project.expectedCost as unknown as string) : null;
  const finalCost = project.finalCost ? parseFloat(project.finalCost as unknown as string) : null;
  const amountPaid = project.amountPaid ? parseFloat(project.amountPaid as unknown as string) : null;
  const discount = project.discount ? parseFloat(project.discount as unknown as string) : 0;
  const remainingDebt = computeDebt(project);

  return {
    id: project.id,
    title: project.title,
    clientId: project.clientId,
    clientName,
    photographerId: project.photographerId,
    photographerName,
    serviceId,
    serviceName,
    assignees,
    status: project.status,
    progress: project.progress,
    startDate: project.startDate,
    deliveryDate: project.deliveryDate,
    weTransferLink: project.weTransferLink,
    expectedCost,
    finalCost,
    amountPaid,
    discount,
    remainingDebt,
    currency: project.currency ?? "DZD",
    originalClientIdea: project.originalClientIdea ?? null,
    aiGeneratedSuggestion: project.aiGeneratedSuggestion ?? null,
    finalProposedIdea: project.finalProposedIdea ?? null,
    proformaIssuedAt: project.proformaIssuedAt ? project.proformaIssuedAt.toISOString() : null,
    finalInvoiceIssuedAt: project.finalInvoiceIssuedAt ? project.finalInvoiceIssuedAt.toISOString() : null,
    createdAt: project.createdAt.toISOString(),
  };
}

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

  let formatted: Record<string, unknown>[] = await Promise.all(projects.map(formatProject));

  if (qp.success && qp.data.hasDebt === "true") {
    formatted = formatted.filter((p) => ((p.remainingDebt as number) ?? 0) > 0);
  }

  if (user.role === "client") {
    const canSeeFinancials = await getClientCanViewFinancials(user.id);
    if (!canSeeFinancials) {
      formatted = formatted.map(maskFinancials);
    }
  }

  res.json(formatted);
});

router.post("/projects", async (req, res): Promise<void> => {
  const user = await getSessionUser(req, res);
  if (!user) return;

  // Clients cannot create projects via API
  if (user.role === "client") {
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

  // Clients cannot mutate projects
  const user = await getSessionUser(req, res);
  if (!user) return;
  if (user.role === "client") {
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
  if (wasJustCompleted && project.finalCost) {
    const finalCost = parseFloat(project.finalCost as unknown as string);
    if (finalCost > 0) {
      const assigneeRows = await db
        .select({
          userId: projectAssigneesTable.userId,
          name: usersTable.name,
          commissionType: projectAssigneesTable.commissionType,
          commissionValue: projectAssigneesTable.commissionValue,
        })
        .from(projectAssigneesTable)
        .innerJoin(usersTable, eq(projectAssigneesTable.userId, usersTable.id))
        .where(eq(projectAssigneesTable.projectId, project.id));

      for (const a of assigneeRows) {
        if (!a.commissionValue) continue;
        const val = parseFloat(a.commissionValue as string);
        if (val <= 0) continue;
        const amount = a.commissionType === "percentage"
          ? (finalCost * val) / 100
          : val;

        const reference = `commission_auto_${project.id}_${a.userId}`;
        const [dup] = await db
          .select({ id: expensesTable.id })
          .from(expensesTable)
          .where(eq(expensesTable.reference, reference));
        if (dup) continue;

        await db.insert(expensesTable).values({
          category: "creative_payout",
          amount: String(Math.round(amount * 100) / 100),
          date: format(new Date(), "yyyy-MM-dd"),
          description: `${a.name} — ${project.title} — Commission`,
          reference,
        });
      }
    }
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
