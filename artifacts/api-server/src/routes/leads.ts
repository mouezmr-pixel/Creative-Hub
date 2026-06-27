import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, leadsTable, clientsTable, projectsTable, usersTable, servicesTable } from "@workspace/db";
import bcrypt from "bcrypt";
import { requireAccess } from "../middlewares/auth";

const router: IRouter = Router();

async function getServiceName(serviceId: number | null): Promise<string | null> {
  if (!serviceId) return null;
  const [svc] = await db.select({ title: servicesTable.title }).from(servicesTable).where(eq(servicesTable.id, serviceId));
  return svc?.title ?? null;
}

function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function generateUsername(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 20);
  const suffix = Math.floor(Math.random() * 900) + 100;
  return `${base}_${suffix}`;
}

async function formatLead(lead: typeof leadsTable.$inferSelect) {
  const serviceName = await getServiceName(lead.serviceId ?? null);
  return {
    id: lead.id,
    name: lead.name,
    phone: lead.phone ?? null,
    email: lead.email ?? null,
    estimatedValue: lead.estimatedValue ? parseFloat(lead.estimatedValue as unknown as string) : null,
    source: lead.source,
    status: lead.status,
    notes: lead.notes ?? null,
    projectName: lead.projectName ?? null,
    serviceId: lead.serviceId ?? null,
    serviceName,
    lostReason: lead.lostReason ?? null,
    wonMonth: lead.wonMonth ?? null,
    createdAt: lead.createdAt.toISOString(),
  };
}

router.get("/leads", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"], requiredPermissions: ["canViewLeads"] }))) return;
  const leads = await db.select().from(leadsTable).orderBy(leadsTable.createdAt);
  res.json(await Promise.all(leads.map(formatLead)));
});

router.post("/leads", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"], requiredPermissions: ["canViewLeads"] }))) return;
  const { name, phone, email, estimatedValue, source, status, notes, projectName, serviceId, lostReason, wonMonth } = req.body;
  if (!name || !source) {
    res.status(400).json({ error: "name and source are required" });
    return;
  }
  const finalStatus = status ?? "new";
  const [lead] = await db.insert(leadsTable).values({
    name,
    phone: phone ?? null,
    email: email ?? null,
    estimatedValue: estimatedValue?.toString() ?? null,
    source: source ?? "other",
    status: finalStatus,
    notes: notes ?? null,
    projectName: projectName ?? null,
    serviceId: serviceId ?? null,
    lostReason: lostReason ?? null,
    wonMonth: finalStatus === "won" ? (wonMonth ?? getCurrentMonth()) : (wonMonth ?? null),
  }).returning();
  res.status(201).json(await formatLead(lead));
});

router.get("/leads/lost-reasons", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"], requiredPermissions: ["canViewLeads"] }))) return;
  const rows = await db.select({ reason: leadsTable.lostReason }).from(leadsTable)
    .where(sql`${leadsTable.lostReason} IS NOT NULL AND ${leadsTable.lostReason} != ''`)
    .groupBy(leadsTable.lostReason)
    .orderBy(leadsTable.lostReason);
  const reasons = rows.map((r) => r.reason).filter(Boolean) as string[];
  // Include some common defaults
  const defaults = ["Not our ideal client", "Price too high", "No response", "Chose competitor", "Timing not right", "Other"];
  const all = [...new Set([...defaults, ...reasons])];
  res.json(all);
});

router.get("/leads/:id", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"], requiredPermissions: ["canViewLeads"] }))) return;
  const id = parseInt(req.params.id, 10);
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, id));
  if (!lead) { res.status(404).json({ error: "Lead not found" }); return; }
  res.json(await formatLead(lead));
});

router.patch("/leads/:id", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"], requiredPermissions: ["canViewLeads"] }))) return;
  const id = parseInt(req.params.id, 10);
  const { name, phone, email, estimatedValue, source, status, notes, projectName, serviceId, lostReason, wonMonth } = req.body;
  const updateData: Partial<typeof leadsTable.$inferInsert> = {};
  if (name != null) updateData.name = name;
  if (phone !== undefined) updateData.phone = phone;
  if (email !== undefined) updateData.email = email;
  if (estimatedValue !== undefined) updateData.estimatedValue = estimatedValue?.toString() ?? null;
  if (source != null) updateData.source = source;
  if (status != null) updateData.status = status;
  if (notes !== undefined) updateData.notes = notes;
  if (projectName !== undefined) updateData.projectName = projectName;
  if (serviceId !== undefined) updateData.serviceId = serviceId;
  if (lostReason !== undefined) updateData.lostReason = lostReason;
  if (wonMonth !== undefined) updateData.wonMonth = wonMonth;
  // Auto-set wonMonth when status becomes "won"
  if (status === "won") {
    updateData.wonMonth = getCurrentMonth();
  }
  const [lead] = await db.update(leadsTable).set(updateData).where(eq(leadsTable.id, id)).returning();
  if (!lead) { res.status(404).json({ error: "Lead not found" }); return; }
  res.json(await formatLead(lead));
});

router.delete("/leads/:id", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"], requiredPermissions: ["canViewLeads"] }))) return;
  const id = parseInt(req.params.id, 10);
  await db.delete(leadsTable).where(eq(leadsTable.id, id));
  res.sendStatus(204);
});

// Convert lead to client + project
router.post("/leads/:id/convert", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"], requiredPermissions: ["canViewLeads"] }))) return;
  const id = parseInt(req.params.id, 10);
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, id));
  if (!lead) { res.status(404).json({ error: "Lead not found" }); return; }

  const username = generateUsername(lead.name);
  const rawPassword = Math.random().toString(36).slice(-8);
  const hashedPassword = await bcrypt.hash(rawPassword, 10);
  const [newUser] = await db.insert(usersTable).values({
    username,
    password: hashedPassword,
    name: lead.name,
    email: lead.email || null,
    role: "client",
    canViewFinancials: false,
    canManageClients: false,
    canManageAllProjects: false,
    canInvoice: false,
    canViewLeads: false,
    canViewAccounting: false,
  }).returning();

  const [client] = await db.insert(clientsTable).values({
    name: lead.name,
    phone: lead.phone ?? undefined,
    email: lead.email ?? undefined,
    originalIdea: lead.notes ?? undefined,
    userId: newUser.id,
  }).returning();

  const projectTitle = lead.projectName || `${lead.name} — Project`;
  const [project] = await db.insert(projectsTable).values({
    title: projectTitle,
    clientId: client.id,
    serviceId: lead.serviceId ?? null,
    status: "pending",
    progress: 0,
    expectedCost: lead.estimatedValue?.toString() ?? null,
  }).returning();

  await db.update(leadsTable).set({ status: "won", wonMonth: getCurrentMonth() }).where(eq(leadsTable.id, id));

  res.json({
    clientId: client.id,
    projectId: project.id,
    username,
    message: `Lead converted! Client #${client.id} and Project #${project.id} created. Username: ${username}. The client can set their password via the Client Accounts page.`,
  });
});

export default router;
