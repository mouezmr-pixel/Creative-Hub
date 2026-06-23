import { Router, type IRouter } from "express";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import {
  db,
  paymentHistoryTable,
  projectsTable,
  usersTable,
  clientsTable,
} from "@workspace/db";
import { getSessionUser } from "../middlewares/auth";

const router: IRouter = Router();

// GET /payments — financial access required
router.get("/payments", async (req, res): Promise<void> => {
  const user = await getSessionUser(req, res);
  if (!user) return;

  if (user.role !== "admin" && !user.canViewFinancials && !user.canViewAccounting) {
    res.status(403).json({ error: "Financial access required" });
    return;
  }

  const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
  const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : undefined;
  const endDate = req.query.endDate ? new Date(String(req.query.endDate)) : undefined;
  if (endDate) endDate.setHours(23, 59, 59, 999);

  const conditions: any[] = [];
  if (projectId != null && !Number.isNaN(projectId)) {
    conditions.push(eq(paymentHistoryTable.projectId, projectId));
  }
  if (startDate) conditions.push(gte(paymentHistoryTable.paymentDate, startDate));
  if (endDate) conditions.push(lte(paymentHistoryTable.paymentDate, endDate));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      payment: paymentHistoryTable,
      projectTitle: projectsTable.title,
      projectCurrency: projectsTable.currency,
      recorderName: usersTable.name,
      recorderUsername: usersTable.username,
    })
    .from(paymentHistoryTable)
    .leftJoin(projectsTable, eq(paymentHistoryTable.projectId, projectsTable.id))
    .leftJoin(usersTable, eq(paymentHistoryTable.recordedBy, usersTable.id))
    .where(where)
    .orderBy(desc(paymentHistoryTable.paymentDate));

  res.json(
    rows.map((r) => ({
      ...r.payment,
      amount: parseFloat(r.payment.amount as unknown as string),
      project: { id: r.payment.projectId, title: r.projectTitle, currency: r.projectCurrency },
      recorder: r.payment.recordedBy
        ? { id: r.payment.recordedBy, name: r.recorderName, username: r.recorderUsername }
        : null,
    }))
  );
});

// GET /payments/summary — financial access required
router.get("/payments/summary", async (req, res): Promise<void> => {
  const user = await getSessionUser(req, res);
  if (!user) return;

  if (user.role !== "admin" && !user.canViewFinancials && !user.canViewAccounting) {
    res.status(403).json({ error: "Financial access required" });
    return;
  }

  const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : undefined;
  const endDate = req.query.endDate ? new Date(String(req.query.endDate)) : undefined;
  if (endDate) endDate.setHours(23, 59, 59, 999);

  const conditions: any[] = [];
  if (startDate) conditions.push(gte(paymentHistoryTable.paymentDate, startDate));
  if (endDate) conditions.push(lte(paymentHistoryTable.paymentDate, endDate));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      currency: paymentHistoryTable.currency,
      totalAmount: sql<string>`COALESCE(SUM(${paymentHistoryTable.amount}), 0)`,
      paymentCount: sql<number>`COUNT(*)`,
    })
    .from(paymentHistoryTable)
    .where(where)
    .groupBy(paymentHistoryTable.currency);

  res.json(
    rows.map((r) => ({
      currency: r.currency,
      totalAmount: parseFloat(r.totalAmount),
      paymentCount: Number(r.paymentCount),
    }))
  );
});

// GET /payments/project/:projectId — client can access only their own project
router.get("/payments/project/:projectId", async (req, res): Promise<void> => {
  const user = await getSessionUser(req, res);
  if (!user) return;

  const projectId = Number(req.params.projectId);
  if (Number.isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  const [project] = await db
    .select({
      id: projectsTable.id,
      title: projectsTable.title,
      finalCost: projectsTable.finalCost,
      currency: projectsTable.currency,
      clientId: projectsTable.clientId,
    })
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  // Access control: admin / financial role → always allowed
  // client → only if this project belongs to them
  // photographer → only if canViewFinancials or canViewAccounting
  let clientCanViewFinancials = true;
  if (user.role === "client") {
    const [clientRecord] = await db
      .select({ id: clientsTable.id, canViewFinancials: clientsTable.canViewFinancials })
      .from(clientsTable)
      .where(eq(clientsTable.userId, user.id));
    if (!clientRecord || project.clientId !== clientRecord.id) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    clientCanViewFinancials = clientRecord.canViewFinancials ?? false;
  } else if (user.role !== "admin" && !user.canViewFinancials && !user.canViewAccounting) {
    res.status(403).json({ error: "Financial access required" });
    return;
  }

  const payments = await db
    .select()
    .from(paymentHistoryTable)
    .where(eq(paymentHistoryTable.projectId, projectId))
    .orderBy(desc(paymentHistoryTable.paymentDate));

  const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount as unknown as string), 0);
  const finalCost = project.finalCost ? parseFloat(project.finalCost as unknown as string) : 0;

  if (!clientCanViewFinancials) {
    res.json({
      project: { ...project, finalCost: null },
      payments: [],
      summary: { totalPaid: null, paymentCount: null, remainingBalance: null },
    });
    return;
  }

  res.json({
    project: {
      ...project,
      finalCost,
    },
    payments: payments.map((p) => ({
      ...p,
      amount: parseFloat(p.amount as unknown as string),
    })),
    summary: {
      totalPaid,
      paymentCount: payments.length,
      remainingBalance: Math.max(0, finalCost - totalPaid),
    },
  });
});

// POST /payments — admin or canInvoice
router.post("/payments", async (req, res): Promise<void> => {
  const user = await getSessionUser(req, res);
  if (!user) return;

  if (user.role !== "admin" && !user.canInvoice) {
    res.status(403).json({ error: "Invoice permission required" });
    return;
  }

  const { projectId, amount, currency, paymentMethod, receiptNumber, paymentDate, notes } = req.body ?? {};

  const numericAmount = Number(amount);
  if (!projectId || !Number.isFinite(numericAmount) || numericAmount <= 0) {
    res.status(400).json({ error: "projectId and positive amount are required" });
    return;
  }

  const [project] = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(eq(projectsTable.id, Number(projectId)));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (receiptNumber) {
    const [dup] = await db
      .select({ id: paymentHistoryTable.id })
      .from(paymentHistoryTable)
      .where(eq(paymentHistoryTable.receiptNumber, String(receiptNumber)));
    if (dup) {
      res.status(409).json({ error: "Receipt number already exists" });
      return;
    }
  }

  try {
    const [created] = await db
      .insert(paymentHistoryTable)
      .values({
        projectId: Number(projectId),
        amount: String(numericAmount),
        currency: currency || "DZD",
        paymentMethod: paymentMethod || null,
        receiptNumber: receiptNumber || null,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        notes: notes || null,
        recordedBy: user.id,
      })
      .returning();

    // Sync projects.amountPaid = SUM(payment_history.amount) for this project
    const [sumRow] = await db
      .select({ total: sql<string>`COALESCE(SUM(${paymentHistoryTable.amount}), 0)` })
      .from(paymentHistoryTable)
      .where(eq(paymentHistoryTable.projectId, Number(projectId)));
    await db
      .update(projectsTable)
      .set({ amountPaid: sumRow.total } as any)
      .where(eq(projectsTable.id, Number(projectId)));

    res.status(201).json({
      ...created,
      amount: parseFloat(created.amount as unknown as string),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to record payment" });
  }
});

// DELETE /payments/:id — admin only
router.delete("/payments/:id", async (req, res): Promise<void> => {
  const user = await getSessionUser(req, res);
  if (!user) return;

  if (user.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  // Fetch first to capture projectId before deletion
  const [existing] = await db
    .select({ projectId: paymentHistoryTable.projectId })
    .from(paymentHistoryTable)
    .where(eq(paymentHistoryTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }
  const projId = existing.projectId;

  await db.delete(paymentHistoryTable).where(eq(paymentHistoryTable.id, id));

  // Sync projects.amountPaid = SUM(payment_history.amount) for this project
  const [sumRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(${paymentHistoryTable.amount}), 0)` })
    .from(paymentHistoryTable)
    .where(eq(paymentHistoryTable.projectId, projId));
  await db
    .update(projectsTable)
    .set({ amountPaid: sumRow.total } as any)
    .where(eq(projectsTable.id, projId));

  res.json({ ok: true });
});

export default router;
