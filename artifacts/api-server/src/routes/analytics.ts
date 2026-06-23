import { Router, type IRouter } from "express";
import { eq, sql, and, gte, lte, inArray } from "drizzle-orm";
import { db, projectsTable, clientsTable, usersTable, paymentHistoryTable, expensesTable, projectAssigneesTable } from "@workspace/db";
import { GetAnalyticsSummaryQueryParams, GetProjectsByStatusQueryParams, GetDebtListQueryParams } from "@workspace/api-zod";
import { getSessionUser, buildProjectScopeConditions } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/analytics/summary", async (req, res): Promise<void> => {
  const user = await getSessionUser(req, res);
  if (!user) return;

  // Non-admin without canViewFinancials gets zeroed-out financial data
  const canViewFinancials = user.role === "admin" || user.canViewFinancials;

  const qp = GetAnalyticsSummaryQueryParams.safeParse(req.query);
  const photographerId = qp.success ? qp.data.photographerId : undefined;
  const startDate = qp.success ? (qp.data as any).startDate : undefined;
  const endDate = qp.success ? (qp.data as any).endDate : undefined;

  const conditions: any[] = [];
  if (photographerId != null) {
    conditions.push(eq(projectsTable.photographerId, photographerId));
  }
  if (startDate) {
    conditions.push(gte(projectsTable.createdAt, new Date(startDate)));
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(projectsTable.createdAt, end));
  }

  // Scope to own projects for non-admin/non-canManageAllProjects
  if (user.role !== "admin" && !user.canManageAllProjects) {
    if (user.role === "client") {
      const [clientRecord] = await db
        .select({ id: clientsTable.id })
        .from(clientsTable)
        .where(eq(clientsTable.userId, user.id));
      conditions.push(
        clientRecord ? eq(projectsTable.clientId, clientRecord.id) : eq(projectsTable.id, -1)
      );
    } else {
      const assignedRows = await db
        .select({ projectId: projectAssigneesTable.projectId })
        .from(projectAssigneesTable)
        .where(eq(projectAssigneesTable.userId, user.id));
      const assignedIds = assignedRows.map((r) => r.projectId);
      conditions.push(
        assignedIds.length > 0
          ? sql`(${eq(projectsTable.photographerId, user.id)} OR ${inArray(projectsTable.id, assignedIds)})`
          : eq(projectsTable.photographerId, user.id)
      );
    }
  }

  const projectConditions = conditions.length > 0 ? and(...conditions) : undefined;

  const clientConditions = photographerId != null
    ? eq(clientsTable.photographerId, photographerId)
    : undefined;

  const projects = await db
    .select()
    .from(projectsTable)
    .where(projectConditions);

  let invoicedAmount = 0;
  let totalDebt = 0;
  let completedProjects = 0;
  let ongoingProjects = 0;
  let invoicedProjects = 0;
  let pendingProjects = 0;

  const projectIds = projects.map((p) => p.id);

  for (const project of projects) {
    const finalCost = project.finalCost ? parseFloat(project.finalCost as unknown as string) : 0;
    const amountPaid = project.amountPaid ? parseFloat(project.amountPaid as unknown as string) : 0;
    const discount = project.discount ? parseFloat(project.discount as unknown as string) : 0;
    const hasFinalInvoice = !!(project as any).finalInvoiceIssuedAt;
    if (hasFinalInvoice) {
      invoicedAmount += finalCost;
      invoicedProjects++;
    }
    totalDebt += Math.max(0, finalCost - discount - amountPaid);
    if (project.status === "completed") completedProjects++;
    if (project.status === "in_progress") ongoingProjects++;
    if (project.status === "pending") pendingProjects++;
  }

  // Actual revenue = sum of payments collected, grouped by currency
  const revenueByCurrency: Record<string, number> = {};
  const invoicedByCurrency: Record<string, number> = {};
  const debtByCurrency: Record<string, number> = {};
  let actualRevenue = 0;

  if (projectIds.length > 0) {
    const paymentConds: any[] = [
      sql`${paymentHistoryTable.projectId} IN (${sql.join(projectIds.map((id) => sql`${id}`), sql`, `)})`,
    ];
    if (startDate) paymentConds.push(gte(paymentHistoryTable.paymentDate, new Date(startDate)));
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      paymentConds.push(lte(paymentHistoryTable.paymentDate, end));
    }
    const currencyRows = await db
      .select({
        currency: paymentHistoryTable.currency,
        total: sql<string>`COALESCE(SUM(${paymentHistoryTable.amount}), 0)`,
      })
      .from(paymentHistoryTable)
      .where(and(...paymentConds))
      .groupBy(paymentHistoryTable.currency);

    for (const r of currencyRows) {
      const amt = parseFloat(r.total);
      revenueByCurrency[r.currency ?? "DZD"] = amt;
      actualRevenue += amt;
    }
  }

  // Total revenue = sum of finalCost for ALL projects with a final cost
  const totalRevenueByCurrency: Record<string, number> = {};
  let totalRevenue = 0;
  for (const project of projects) {
    const finalCost = project.finalCost ? parseFloat(project.finalCost as unknown as string) : 0;
    if (finalCost <= 0) continue;
    const cur = project.currency ?? "DZD";
    totalRevenueByCurrency[cur] = (totalRevenueByCurrency[cur] ?? 0) + finalCost;
    totalRevenue += finalCost;
  }

  // Invoiced and debt grouped by project currency
  for (const project of projects) {
    const finalCost = project.finalCost ? parseFloat(project.finalCost as unknown as string) : 0;
    const amountPaid = project.amountPaid ? parseFloat(project.amountPaid as unknown as string) : 0;
    const discount = project.discount ? parseFloat(project.discount as unknown as string) : 0;
    const hasFinalInvoice = !!project.finalInvoiceIssuedAt;
    const cur = project.currency ?? "DZD";
    if (hasFinalInvoice) {
      invoicedByCurrency[cur] = (invoicedByCurrency[cur] ?? 0) + finalCost;
    }
    const debt = Math.max(0, finalCost - discount - amountPaid);
    if (debt > 0) debtByCurrency[cur] = (debtByCurrency[cur] ?? 0) + debt;
  }

  // Expenses in same window
  let expensesTotal = 0;
  {
    const expConds: any[] = [];
    if (startDate) expConds.push(gte(expensesTable.date, String(startDate).slice(0, 10)));
    if (endDate) expConds.push(lte(expensesTable.date, String(endDate).slice(0, 10)));
    const expWhere = expConds.length > 0 ? and(...expConds) : undefined;
    const [row] = await db
      .select({ total: sql<string>`COALESCE(SUM(${expensesTable.amount}), 0)` })
      .from(expensesTable)
      .where(expWhere);
    expensesTotal = parseFloat(row?.total ?? "0");
  }

  const totalClients = await db
    .select({ count: sql<number>`count(*)` })
    .from(clientsTable)
    .where(clientConditions)
    .then((rows) => Number(rows[0]?.count ?? 0));

  const collectionRate = invoicedAmount > 0 ? (actualRevenue / invoicedAmount) * 100 : 0;
  const debtPercentage = invoicedAmount > 0 ? (totalDebt / invoicedAmount) * 100 : 0;
  const netProfit = actualRevenue - expensesTotal;
  const profitMargin = actualRevenue > 0 ? (netProfit / actualRevenue) * 100 : 0;

  const safe = (v: number) => (canViewFinancials ? v : 0);

  const safeByCurrency = (map: Record<string, number>) =>
    canViewFinancials ? map : {};

  res.json({
    totalRevenue: safe(totalRevenue),
    totalCollected: safe(actualRevenue),
    totalDebt: safe(totalDebt),
    totalProjects: projects.length,
    totalClients,
    completedProjects,
    ongoingProjects,
    totalRevenueByCurrency: safeByCurrency(totalRevenueByCurrency),
    revenueByCurrency: safeByCurrency(revenueByCurrency),
    invoicedByCurrency: safeByCurrency(invoicedByCurrency),
    debtByCurrency: safeByCurrency(debtByCurrency),
    revenue: {
      actual: safe(actualRevenue),
      invoiced: safe(invoicedAmount),
      collectionRate: collectionRate.toFixed(2),
    },
    debt: {
      total: safe(totalDebt),
      percentage: debtPercentage.toFixed(2),
    },
    expenses: { total: safe(expensesTotal) },
    profit: { net: safe(netProfit), margin: profitMargin.toFixed(2) },
    projects: {
      total: projects.length,
      pending: pendingProjects,
      inProgress: ongoingProjects,
      completed: completedProjects,
      invoiced: invoicedProjects,
    },
  });
});

router.get("/analytics/projects-by-status", async (req, res): Promise<void> => {
  const user = await getSessionUser(req, res);
  if (!user) return;

  // Require admin or canViewFinancials
  if (user.role !== "admin" && !user.canViewFinancials) {
    res.status(403).json({ error: "Financial access required" });
    return;
  }

  const qp = GetProjectsByStatusQueryParams.safeParse(req.query);
  const photographerId = qp.success ? qp.data.photographerId : undefined;

  const conditions: any[] = [];
  if (photographerId != null) {
    conditions.push(eq(projectsTable.photographerId, photographerId));
  }

  // Scope to own projects for photographers without canManageAllProjects
  if (user.role !== "admin" && !user.canManageAllProjects) {
    const assignedRows = await db
      .select({ projectId: projectAssigneesTable.projectId })
      .from(projectAssigneesTable)
      .where(eq(projectAssigneesTable.userId, user.id));
    const assignedIds = assignedRows.map((r) => r.projectId);
    conditions.push(
      assignedIds.length > 0
        ? sql`(${eq(projectsTable.photographerId, user.id)} OR ${inArray(projectsTable.id, assignedIds)})`
        : eq(projectsTable.photographerId, user.id)
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      status: projectsTable.status,
      count: sql<number>`count(*)`,
    })
    .from(projectsTable)
    .where(whereClause)
    .groupBy(projectsTable.status);

  res.json(rows.map((r) => ({ status: r.status, count: Number(r.count) })));
});

router.get("/analytics/debt-list", async (req, res): Promise<void> => {
  const user = await getSessionUser(req, res);
  if (!user) return;

  // Require admin or canViewFinancials
  if (user.role !== "admin" && !user.canViewFinancials) {
    res.status(403).json({ error: "Financial access required" });
    return;
  }

  const qp = GetDebtListQueryParams.safeParse(req.query);
  const photographerId = qp.success ? qp.data.photographerId : undefined;

  const conditions: any[] = [];
  if (photographerId != null) {
    conditions.push(eq(projectsTable.photographerId, photographerId));
  }

  // Scope to own projects for photographers without canManageAllProjects
  if (user.role !== "admin" && !user.canManageAllProjects) {
    const assignedRows = await db
      .select({ projectId: projectAssigneesTable.projectId })
      .from(projectAssigneesTable)
      .where(eq(projectAssigneesTable.userId, user.id));
    const assignedIds = assignedRows.map((r) => r.projectId);
    conditions.push(
      assignedIds.length > 0
        ? sql`(${eq(projectsTable.photographerId, user.id)} OR ${inArray(projectsTable.id, assignedIds)})`
        : eq(projectsTable.photographerId, user.id)
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const projects = await db
    .select()
    .from(projectsTable)
    .where(whereClause)
    .orderBy(projectsTable.createdAt);

  const withDebt = [];
  for (const project of projects) {
    const finalCost = project.finalCost ? parseFloat(project.finalCost as unknown as string) : 0;
    const amountPaid = project.amountPaid ? parseFloat(project.amountPaid as unknown as string) : 0;
    const discount = project.discount ? parseFloat(project.discount as unknown as string) : 0;
    const remainingDebt = Math.max(0, finalCost - discount - amountPaid);

    if (remainingDebt > 0) {
      let clientName: string | null = null;
      let photographerName: string | null = null;

      const [client] = await db
        .select({ name: clientsTable.name })
        .from(clientsTable)
        .where(eq(clientsTable.id, project.clientId));
      clientName = client?.name ?? null;

      if (project.photographerId) {
        const [photographer] = await db
          .select({ name: usersTable.name })
          .from(usersTable)
          .where(eq(usersTable.id, project.photographerId));
        photographerName = photographer?.name ?? null;
      }

      withDebt.push({
        id: project.id,
        title: project.title,
        clientId: project.clientId,
        clientName,
        photographerId: project.photographerId,
        photographerName,
        status: project.status,
        progress: project.progress,
        startDate: project.startDate,
        deliveryDate: project.deliveryDate,
        weTransferLink: project.weTransferLink,
        expectedCost: project.expectedCost ? parseFloat(project.expectedCost as unknown as string) : null,
        finalCost: project.finalCost ? parseFloat(project.finalCost as unknown as string) : null,
        amountPaid: project.amountPaid ? parseFloat(project.amountPaid as unknown as string) : null,
        remainingDebt,
        createdAt: project.createdAt.toISOString(),
      });
    }
  }

  res.json(withDebt);
});

export default router;
