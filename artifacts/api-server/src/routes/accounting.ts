import { Router, type IRouter } from "express";
import { eq, sql, and, gte, lte, inArray, or } from "drizzle-orm";
import {
  db, expensesTable, projectsTable, servicesTable, usersTable,
  projectAssigneesTable, paymentHistoryTable, recurringExpensesTable,
} from "@workspace/db";
import { format, subMonths } from "date-fns";
import { requireAccess, getSessionUser } from "../middlewares/auth";

const router: IRouter = Router();

function formatExpense(expense: typeof expensesTable.$inferSelect) {
  return {
    id: expense.id,
    category: expense.category,
    amount: parseFloat(expense.amount as unknown as string),
    date: expense.date,
    description: expense.description ?? null,
    reference: expense.reference ?? null,
    createdAt: expense.createdAt.toISOString(),
  };
}

router.get("/expenses", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"], requiredPermissions: ["canViewAccounting"] }))) return;
  const expenses = await db.select().from(expensesTable).orderBy(expensesTable.date);
  res.json(expenses.map(formatExpense));
});

router.post("/expenses", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"], requiredPermissions: ["canViewAccounting"] }))) return;
  const { category, amount, date, description, reference } = req.body;
  if (!category || !amount || !date) {
    res.status(400).json({ error: "category, amount, and date are required" });
    return;
  }

  // If reference is provided, check for duplicates
  if (reference) {
    const [dup] = await db
      .select({ id: expensesTable.id })
      .from(expensesTable)
      .where(eq(expensesTable.reference, reference));
    if (dup) {
      res.status(409).json({ error: "This payout has already been recorded as an expense", existingId: dup.id });
      return;
    }
  }

  const [expense] = await db.insert(expensesTable).values({
    category,
    amount: String(amount),
    date,
    description: description ?? null,
    reference: reference ?? null,
  }).returning();
  res.status(201).json(formatExpense(expense));
});

// ─── POST /accounting/process-salaries/:month ────────────────────────────────
// Auto-create salary expenses for all salaried creatives for a given month.
// Dedup by reference: "salary_auto_{userId}_{month}". Skips if already recorded.
router.post("/accounting/process-salaries/:month", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"], requiredPermissions: ["canViewAccounting"] }))) return;
  const month = req.params.month;
  if (!/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ error: "month must be YYYY-MM format" });
    return;
  }

  const salaried = await db
    .select()
    .from(usersTable)
    .where(
      and(
        eq(usersTable.role, "photographer"),
        sql`${usersTable.paymentType} = 'monthly_salary'`,
        sql`${usersTable.salaryAmount} IS NOT NULL`
      )
    );

  let created = 0;
  let skipped = 0;
  const date = `${month}-01`;

  for (const user of salaried) {
    const salaryAmount = (user as any).salaryAmount;
    if (!salaryAmount) continue;
    const reference = `salary_auto_${user.id}_${month}`;

    const [dup] = await db
      .select({ id: expensesTable.id })
      .from(expensesTable)
      .where(eq(expensesTable.reference, reference));

    if (dup) { skipped++; continue; }

    await db.insert(expensesTable).values({
      category: "creative_payout",
      amount: String(salaryAmount),
      date,
      description: `${user.name} — Monthly Salary`,
      reference,
    });
    created++;
  }

  res.json({ month, created, skipped });
});

// ─── Recurring Expenses ───────────────────────────────────────────────

function formatRecurringExpense(e: typeof recurringExpensesTable.$inferSelect) {
  return {
    id: e.id,
    name: e.name,
    category: e.category,
    amount: parseFloat(e.amount as unknown as string),
    description: e.description ?? null,
    isActive: e.isActive,
    createdAt: e.createdAt.toISOString(),
  };
}

router.get("/recurring-expenses", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"], requiredPermissions: ["canViewAccounting"] }))) return;
  const items = await db.select().from(recurringExpensesTable).orderBy(recurringExpensesTable.name);
  res.json(items.map(formatRecurringExpense));
});

router.post("/recurring-expenses", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"], requiredPermissions: ["canViewAccounting"] }))) return;
  const { name, category, amount, description, isActive } = req.body;
  if (!name || !category || !amount) {
    res.status(400).json({ error: "name, category, and amount are required" });
    return;
  }
  const [item] = await db.insert(recurringExpensesTable).values({
    name,
    category,
    amount: String(amount),
    description: description ?? null,
    isActive: isActive !== false,
  }).returning();
  res.status(201).json(formatRecurringExpense(item));
});

router.patch("/recurring-expenses/:id", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"], requiredPermissions: ["canViewAccounting"] }))) return;
  const id = parseInt(req.params.id, 10);
  const { name, category, amount, description, isActive } = req.body;
  const updateData: Partial<typeof recurringExpensesTable.$inferInsert> = {};
  if (name != null) updateData.name = name;
  if (category != null) updateData.category = category;
  if (amount != null) updateData.amount = String(amount);
  if (description !== undefined) updateData.description = description;
  if (isActive !== undefined) updateData.isActive = isActive;
  const [item] = await db.update(recurringExpensesTable).set(updateData).where(eq(recurringExpensesTable.id, id)).returning();
  if (!item) { res.status(404).json({ error: "Recurring expense not found" }); return; }
  res.json(formatRecurringExpense(item));
});

router.delete("/recurring-expenses/:id", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"], requiredPermissions: ["canViewAccounting"] }))) return;
  const id = parseInt(req.params.id, 10);
  await db.delete(recurringExpensesTable).where(eq(recurringExpensesTable.id, id));
  res.sendStatus(204);
});

// ─── POST /accounting/process-recurring ────────────────────────────────
// Auto-create expenses from all active recurring templates for the given month.
// Dedup by reference: "recurring_{templateId}_{YYYY-MM}". Skips if already recorded.
router.post("/accounting/process-recurring/:month", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"], requiredPermissions: ["canViewAccounting"] }))) return;
  const month = req.params.month;
  if (!/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ error: "month must be YYYY-MM format" });
    return;
  }

  const templates = await db
    .select()
    .from(recurringExpensesTable)
    .where(eq(recurringExpensesTable.isActive, true));

  let created = 0;
  let skipped = 0;
  const date = `${month}-01`;

  for (const tpl of templates) {
    const reference = `recurring_${tpl.id}_${month}`;

    const [dup] = await db
      .select({ id: expensesTable.id })
      .from(expensesTable)
      .where(eq(expensesTable.reference, reference));

    if (dup) { skipped++; continue; }

    await db.insert(expensesTable).values({
      category: tpl.category,
      amount: String(tpl.amount),
      date,
      description: tpl.description ?? tpl.name,
      reference,
    });
    created++;
  }

  res.json({ month, created, skipped });
});

router.patch("/expenses/:id", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"], requiredPermissions: ["canViewAccounting"] }))) return;
  const id = parseInt(req.params.id, 10);
  const { category, amount, date, description } = req.body;
  const updateData: Partial<typeof expensesTable.$inferInsert> = {};
  if (category != null) updateData.category = category;
  if (amount != null) updateData.amount = String(amount);
  if (date != null) updateData.date = date;
  if (description !== undefined) updateData.description = description;
  const [expense] = await db.update(expensesTable).set(updateData).where(eq(expensesTable.id, id)).returning();
  if (!expense) { res.status(404).json({ error: "Expense not found" }); return; }
  res.json(formatExpense(expense));
});

router.delete("/expenses/:id", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"], requiredPermissions: ["canViewAccounting"] }))) return;
  const id = parseInt(req.params.id, 10);
  await db.delete(expensesTable).where(eq(expensesTable.id, id));
  res.sendStatus(204);
});

// ─── GET /accounting/summary ────────────────────────────────────────────────
// Revenue = sum of all collected payments (payment_history), grouped by currency.
// Monthly bar-chart buckets payments by payment_date.
router.get("/accounting/summary", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"], requiredPermissions: ["canViewAccounting"] }))) return;

  // Revenue: sum of all payment_history grouped by currency
  const paymentRows = await db
    .select({
      currency: paymentHistoryTable.currency,
      total: sql<string>`COALESCE(SUM(${paymentHistoryTable.amount}), 0)`,
    })
    .from(paymentHistoryTable)
    .groupBy(paymentHistoryTable.currency);

  const revenueByCurrency: Record<string, number> = {};
  for (const row of paymentRows) {
    revenueByCurrency[row.currency ?? "DZD"] = parseFloat(row.total);
  }

  const expenses = await db.select().from(expensesTable);
  const totalExpenses = expenses.reduce(
    (sum, e) => sum + parseFloat(e.amount as unknown as string), 0
  );
  const expensesByCurrency: Record<string, number> = { DZD: totalExpenses };

  const netProfitByCurrency: Record<string, number> = {};
  for (const [cur, rev] of Object.entries(revenueByCurrency)) {
    netProfitByCurrency[cur] = Math.round((rev - (cur === "DZD" ? totalExpenses : 0)) * 100) / 100;
  }

  // Monthly breakdown: last 12 months — bucket payments by payment_date
  const now = new Date();
  const monthlyMap: Record<string, { revenueByCurrency: Record<string, number>; expensesByCurrency: Record<string, number> }> = {};
  for (let i = 11; i >= 0; i--) {
    const key = format(subMonths(now, i), "yyyy-MM");
    monthlyMap[key] = { revenueByCurrency: {}, expensesByCurrency: {} };
  }

  const allPayments = await db
    .select({
      paymentDate: paymentHistoryTable.paymentDate,
      amount: paymentHistoryTable.amount,
      currency: paymentHistoryTable.currency,
    })
    .from(paymentHistoryTable);

  for (const p of allPayments) {
    const key = format(p.paymentDate, "yyyy-MM");
    if (monthlyMap[key] !== undefined) {
      const cur = p.currency ?? "DZD";
      monthlyMap[key].revenueByCurrency[cur] = (monthlyMap[key].revenueByCurrency[cur] ?? 0) + parseFloat(p.amount as unknown as string);
    }
  }

  for (const e of expenses) {
    const key = e.date.substring(0, 7);
    if (monthlyMap[key] !== undefined) {
      monthlyMap[key].expensesByCurrency["DZD"] = (monthlyMap[key].expensesByCurrency["DZD"] ?? 0) + parseFloat(e.amount as unknown as string);
    }
  }

  const monthly = Object.entries(monthlyMap).map(([month, data]) => ({
    month,
    revenueByCurrency: data.revenueByCurrency,
    expensesByCurrency: data.expensesByCurrency,
  }));

  res.json({ revenueByCurrency, expensesByCurrency, netProfitByCurrency, monthly });
});

// ─── GET /accounting/monthly ─────────────────────────────────────────────────
// Revenue = payments received in that month (payment_history).
// Service breakdown + transactions are payment-based.
// Team payouts remain commission-based (earned on delivery, not payment date).
router.get("/accounting/monthly", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"], requiredPermissions: ["canViewAccounting"] }))) return;

  const now = new Date();
  const month = (req.query.month as string) ?? format(now, "yyyy-MM");
  const [year, mon] = month.split("-").map(Number);

  const monthStart = new Date(year, mon - 1, 1);
  const monthEnd = new Date(year, mon, 0, 23, 59, 59, 999);

  // Payments received this month
  const monthPaymentRows = await db
    .select({
      payment: paymentHistoryTable,
      projectTitle: projectsTable.title,
      projectServiceId: projectsTable.serviceId,
    })
    .from(paymentHistoryTable)
    .leftJoin(projectsTable, eq(paymentHistoryTable.projectId, projectsTable.id))
    .where(
      and(
        gte(paymentHistoryTable.paymentDate, monthStart),
        lte(paymentHistoryTable.paymentDate, monthEnd)
      )
    );

  const allServices = await db.select().from(servicesTable);
  const allExpenses = await db.select().from(expensesTable);
  const allUsers = await db.select().from(usersTable);

  const serviceMap: Record<number, string> = {};
  for (const s of allServices) serviceMap[s.id] = s.title;

  // Revenue from payments
  const revenueByCurrency: Record<string, number> = {};
  let revenue = 0;
  for (const row of monthPaymentRows) {
    const amt = parseFloat(row.payment.amount as unknown as string);
    const cur = row.payment.currency ?? "DZD";
    revenueByCurrency[cur] = (revenueByCurrency[cur] ?? 0) + amt;
    revenue += amt;
  }
  revenue = Math.round(revenue * 100) / 100;

  const monthExpenses = allExpenses.filter((e) => e.date.startsWith(month));

  // ── Team Payouts (commission-based: earned on delivery, not payment date) ──
  const allProjects = await db.select().from(projectsTable);

  const salariedCreatives = allUsers.filter(
    (u) => u.role === "photographer" && (u as any).paymentType === "monthly_salary" && (u as any).salaryAmount
  );
  const salaryItems = salariedCreatives.map((u) => ({
    userId: u.id,
    name: u.name,
    paymentType: "monthly_salary" as const,
    amount: parseFloat((u as any).salaryAmount as string),
    commissionType: null as string | null,
  }));
  const totalSalaries = salaryItems.reduce((sum, i) => sum + i.amount, 0);

  const monthCompletedProjects = allProjects.filter((p) => {
    if (p.status !== "completed" || !p.finalCost) return false;
    return p.completedAt && format(p.completedAt, "yyyy-MM") === month;
  });
  const monthCompletedIds = monthCompletedProjects.map((p) => p.id);

  let perProjectItems: Array<{
    userId: number; name: string; paymentType: "per_project";
    amount: number; commissionType: string | null;
  }> = [];

  if (monthCompletedIds.length > 0) {
    const assigneeRows = await db
      .select({
        userId: projectAssigneesTable.userId,
        projectId: projectAssigneesTable.projectId,
        commissionType: projectAssigneesTable.commissionType,
        commissionValue: projectAssigneesTable.commissionValue,
        paymentType: usersTable.paymentType,
        name: usersTable.name,
      })
      .from(projectAssigneesTable)
      .innerJoin(usersTable, eq(projectAssigneesTable.userId, usersTable.id))
      .where(inArray(projectAssigneesTable.projectId, monthCompletedIds));

    const perProjectMap: Record<number, { name: string; amount: number; commissionType: string | null }> = {};
    for (const row of assigneeRows) {
      if ((row.paymentType ?? "per_project") !== "per_project") continue;
      if (!row.commissionValue) continue;
      const commissionVal = parseFloat(row.commissionValue as string);
      const proj = monthCompletedProjects.find((p) => p.id === row.projectId);
      if (!proj) continue;
      let feeAmount = 0;
      if (row.commissionType === "percentage") {
        feeAmount = (parseFloat(proj.finalCost as unknown as string) * commissionVal) / 100;
      } else {
        feeAmount = commissionVal;
      }
      if (!perProjectMap[row.userId]) {
        perProjectMap[row.userId] = { name: row.name, amount: 0, commissionType: row.commissionType ?? null };
      }
      perProjectMap[row.userId].amount += feeAmount;
    }
    perProjectItems = Object.entries(perProjectMap).map(([uid, data]) => ({
      userId: parseInt(uid),
      name: data.name,
      paymentType: "per_project" as const,
      amount: Math.round(data.amount * 100) / 100,
      commissionType: data.commissionType,
    }));
  }

  const totalPerProjectFees = perProjectItems.reduce((sum, i) => sum + i.amount, 0);
  const teamPayouts = {
    totalSalaries: Math.round(totalSalaries * 100) / 100,
    totalPerProjectFees: Math.round(totalPerProjectFees * 100) / 100,
    totalPayout: Math.round((totalSalaries + totalPerProjectFees) * 100) / 100,
    items: [...salaryItems, ...perProjectItems],
  };

  const generalExpenses = monthExpenses.reduce((sum, e) => sum + parseFloat(e.amount as unknown as string), 0);
  const projectCosts = Math.round(totalPerProjectFees * 100) / 100;
  const operatingExpenses = Math.round((totalSalaries + generalExpenses) * 100) / 100;
  const totalExpenses = Math.round((generalExpenses + totalSalaries + totalPerProjectFees) * 100) / 100;

  const expensesByCurrency: Record<string, number> = { DZD: totalExpenses };
  const netProfitByCurrency: Record<string, number> = {};
  for (const [cur, rev] of Object.entries(revenueByCurrency)) {
    netProfitByCurrency[cur] = Math.round((rev - (cur === "DZD" ? totalExpenses : 0)) * 100) / 100;
  }

  // ── Service breakdown: group payments by project's service, per currency ──
  const serviceRevMap: Record<string, {
    serviceId: number | null;
    revenue: number;
    revenueByCurrency: Record<string, number>;
    projectIds: Set<number>;
  }> = {};

  for (const row of monthPaymentRows) {
    const sid = row.projectServiceId as number | null;
    const key = sid ? `svc_${sid}` : `proj_${row.payment.projectId}`;
    if (!serviceRevMap[key]) {
      serviceRevMap[key] = { serviceId: sid ?? null, revenue: 0, revenueByCurrency: {}, projectIds: new Set() };
    }
    const amt = parseFloat(row.payment.amount as unknown as string);
    const cur = row.payment.currency ?? "DZD";
    serviceRevMap[key].revenue += amt;
    serviceRevMap[key].revenueByCurrency[cur] = (serviceRevMap[key].revenueByCurrency[cur] ?? 0) + amt;
    serviceRevMap[key].projectIds.add(row.payment.projectId);
  }

  const serviceBreakdown = Object.entries(serviceRevMap).map(([key, data]) => {
    const sName = data.serviceId
      ? (serviceMap[data.serviceId] ?? "Unknown Service")
      : (key.startsWith("proj_")
        ? allProjects.find((p) => String(p.id) === key.replace("proj_", ""))?.title ?? "Project"
        : "Unknown");
    return {
      serviceId: data.serviceId,
      serviceName: sName,
      revenue: Math.round(data.revenue * 100) / 100,
      revenueByCurrency: Object.fromEntries(
        Object.entries(data.revenueByCurrency).map(([c, v]) => [c, Math.round(v * 100) / 100])
      ),
      percentage: revenue > 0 ? Math.round((data.revenue / revenue) * 100) : 0,
      projectCount: data.projectIds.size,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  // ── Transactions: individual payments + expenses ─────────────────────────
  const transactions: Array<{
    id: number; type: "revenue" | "expense"; name: string;
    category: string | null; amount: number; date: string; currency: string | null;
  }> = [];

  for (const row of monthPaymentRows) {
    const sid = row.projectServiceId as number | null;
    transactions.push({
      id: row.payment.id,
      type: "revenue",
      name: row.projectTitle ?? `Project #${row.payment.projectId}`,
      category: sid ? (serviceMap[sid] ?? null) : null,
      amount: parseFloat(row.payment.amount as unknown as string),
      date: format(row.payment.paymentDate, "yyyy-MM-dd"),
      currency: row.payment.currency ?? "DZD",
    });
  }

  for (const e of monthExpenses) {
    transactions.push({
      id: e.id,
      type: "expense",
      name: e.description ?? e.category,
      category: e.category,
      amount: parseFloat(e.amount as unknown as string),
      date: e.date,
      currency: null,
    });
  }

  transactions.sort((a, b) => a.date.localeCompare(b.date));

  res.json({
    month, revenueByCurrency, expensesByCurrency, netProfitByCurrency,
    projectCosts, operatingExpenses,
    serviceBreakdown, transactions, teamPayouts,
  });
});

// ─── GET /accounting/my-dues ──────────────────────────────────────────────────
router.get("/accounting/my-dues", async (req, res): Promise<void> => {
  const user = await getSessionUser(req, res);
  if (!user) return;
  if (user.role !== "photographer") {
    res.status(403).json({ error: "Only creatives can access this" });
    return;
  }

  const now = new Date();
  const month = format(now, "yyyy-MM");
  const paymentType = (user as any).paymentType ?? "per_project";
  const salaryAmount = (user as any).salaryAmount
    ? parseFloat((user as any).salaryAmount as string)
    : null;

  let monthlySalary: { amount: number; recorded: boolean } | null = null;
  if (paymentType === "monthly_salary" && salaryAmount) {
    const reference = `salary_auto_${user.id}_${month}`;
    const [dup] = await db
      .select({ id: expensesTable.id })
      .from(expensesTable)
      .where(eq(expensesTable.reference, reference));
    monthlySalary = { amount: salaryAmount, recorded: !!dup };
  }

  // Projects where user is primary photographer or assignee
  const assignedRows = await db
    .select({ projectId: projectAssigneesTable.projectId })
    .from(projectAssigneesTable)
    .where(eq(projectAssigneesTable.userId, user.id));
  const assignedIds = assignedRows.map((r) => r.projectId);

  const allUserProjects = await db
    .select()
    .from(projectsTable)
    .where(
      or(
        eq(projectsTable.photographerId, user.id),
        assignedIds.length > 0
          ? inArray(projectsTable.id, assignedIds)
          : undefined,
      ),
    );

  const commissionRows = await db
    .select()
    .from(projectAssigneesTable)
    .where(eq(projectAssigneesTable.userId, user.id));
  const commissionMap: Record<number, { commissionType: string | null; commissionValue: number | null }> = {};
  for (const c of commissionRows) {
    commissionMap[c.projectId] = {
      commissionType: c.commissionType ?? null,
      commissionValue: c.commissionValue ? parseFloat(c.commissionValue as string) : null,
    };
  }

  const projects = await Promise.all(
    allUserProjects.map(async (p) => {
      const comm = commissionMap[p.id];
      let calculatedFee: number | null = null;
      if (comm?.commissionValue) {
        if (comm.commissionType === "percentage" && p.finalCost) {
          calculatedFee = (parseFloat(p.finalCost as string) * comm.commissionValue) / 100;
        } else if (comm.commissionType === "fixed") {
          calculatedFee = comm.commissionValue;
        }
      }
      return {
        id: p.id,
        title: p.title,
        status: p.status,
        finalCost: p.finalCost ? parseFloat(p.finalCost as string) : null,
        commissionType: comm?.commissionType ?? null,
        commissionValue: comm?.commissionValue ?? null,
        calculatedFee,
      };
    }),
  );

  const recentExpenses = await db
    .select()
    .from(expensesTable)
    .where(
      and(
        eq(expensesTable.category, "creative_payout"),
        sql`${expensesTable.description} LIKE ${`%${user.name}%`}`,
      ),
    )
    .orderBy(expensesTable.date)
    .limit(20);

  const recentPayouts = recentExpenses.map((e) => ({
    id: e.id,
    amount: parseFloat(e.amount as unknown as string),
    date: e.date,
    description: e.description ?? null,
    reference: e.reference ?? null,
  }));

  const totalDueThisMonth = paymentType === "monthly_salary"
    ? (monthlySalary?.amount ?? 0)
    : projects
        .filter((p) => p.status === "completed" && p.calculatedFee)
        .reduce((sum, p) => sum + (p.calculatedFee ?? 0), 0);

  res.json({
    paymentType,
    salaryAmount,
    monthlySalary,
    totalDueThisMonth,
    projects,
    recentPayouts,
    month,
  });
});

export default router;
