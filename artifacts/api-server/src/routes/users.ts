import { Router, type IRouter } from "express";
import { eq, isNull } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  CreateUserBody,
  GetUserParams,
  UpdateUserBody,
  UpdateUserParams,
  DeleteUserParams,
} from "@workspace/api-zod";
import bcrypt from "bcrypt";
import { requireAccess } from "../middlewares/auth";

const SALT_ROUNDS = 10;

const router: IRouter = Router();

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email ?? null,
    role: user.role,
    profession: user.profession ?? null,
    paymentType: (user as any).paymentType ?? "per_project",
    salaryAmount: (user as any).salaryAmount ? parseFloat((user as any).salaryAmount) : null,
    canViewFinancials: user.canViewFinancials,
    canManageClients: user.canManageClients,
    canManageAllProjects: user.canManageAllProjects,
    canInvoice: user.canInvoice,
    canViewLeads: user.canViewLeads,
    canViewAccounting: user.canViewAccounting,
    archivedAt: user.archivedAt ? user.archivedAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
  };
}

router.get("/users", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;
  // Return all users including archived so admin can see them
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  res.json(users.map(formatUser));
});

router.post("/users", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const hashedPassword = await bcrypt.hash(parsed.data.password, SALT_ROUNDS);
  const insertData: any = {
    username: parsed.data.username,
    password: hashedPassword,
    name: parsed.data.name,
    role: parsed.data.role,
    email: (parsed.data as any).email ?? null,
    profession: (parsed.data as any).profession ?? null,
    paymentType: (parsed.data as any).paymentType ?? "per_project",
    salaryAmount: (parsed.data as any).salaryAmount != null ? String((parsed.data as any).salaryAmount) : null,
    canViewFinancials: (parsed.data as any).canViewFinancials ?? false,
    canManageClients: (parsed.data as any).canManageClients ?? false,
    canManageAllProjects: (parsed.data as any).canManageAllProjects ?? false,
    canInvoice: (parsed.data as any).canInvoice ?? false,
  };
  const [user] = await db.insert(usersTable).values(insertData as any).returning();
  res.status(201).json(formatUser(user));
});

router.get("/users/:id", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetUserParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, params.data.id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(formatUser(user));
});

router.patch("/users/:id", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateUserParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = req.body;
  const updateData: Partial<typeof usersTable.$inferInsert> = {};
  if (body.name != null) updateData.name = body.name;
  if (body.email != null) updateData.email = body.email;
  if (body.username != null) updateData.username = body.username;
  if (body.password != null) updateData.password = await bcrypt.hash(body.password, SALT_ROUNDS);
  if (body.profession !== undefined) updateData.profession = body.profession;
  if (body.canViewFinancials != null) updateData.canViewFinancials = body.canViewFinancials;
  if (body.canManageClients != null) updateData.canManageClients = body.canManageClients;
  if (body.canManageAllProjects != null) updateData.canManageAllProjects = body.canManageAllProjects;
  if (body.canInvoice != null) updateData.canInvoice = body.canInvoice;
  if (body.canViewLeads != null) updateData.canViewLeads = body.canViewLeads;
  if (body.canViewAccounting != null) updateData.canViewAccounting = body.canViewAccounting;
  if (body.paymentType !== undefined) (updateData as any).paymentType = body.paymentType;
  if (body.salaryAmount !== undefined) (updateData as any).salaryAmount = body.salaryAmount != null ? String(body.salaryAmount) : null;

  if (Object.keys(updateData).length === 0) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(formatUser(user));
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set(updateData)
    .where(eq(usersTable.id, params.data.id))
    .returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(formatUser(user));
});

// Unarchive: clears archivedAt so the user can log in again.
router.post("/users/:id/unarchive", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [user] = await db
    .update(usersTable)
    .set({ archivedAt: null } as any)
    .where(eq(usersTable.id, id))
    .returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(formatUser(user));
});

// Soft-delete: sets archivedAt instead of removing the row.
// This preserves FK integrity on project_assignees (RESTRICT) and keeps
// commission/financial history intact. Archived users cannot log in.
router.delete("/users/:id", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteUserParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [user] = await db
    .update(usersTable)
    .set({ archivedAt: new Date() } as any)
    .where(eq(usersTable.id, params.data.id))
    .returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(formatUser(user));
});

export default router;
