import { Router, type IRouter } from "express";
import { eq, isNotNull } from "drizzle-orm";
import { db, clientsTable, usersTable } from "@workspace/db";
import bcrypt from "bcrypt";
import { requireAccess } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/client-accounts", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;

  const rows = await db
    .select({
      id: clientsTable.id,
      name: clientsTable.name,
      email: clientsTable.email,
      phone: clientsTable.phone,
      userId: clientsTable.userId,
      canViewProposal: clientsTable.canViewProposal,
      canViewFinancials: clientsTable.canViewFinancials,
      username: usersTable.username,
    })
    .from(clientsTable)
    .innerJoin(usersTable, eq(usersTable.id, clientsTable.userId))
    .where(isNotNull(clientsTable.userId))
    .orderBy(clientsTable.name);

  res.json(rows);
});

router.patch("/client-accounts/:id", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;

  const clientId = parseInt(req.params.id, 10);
  if (isNaN(clientId)) {
    res.status(400).json({ error: "Invalid client id" });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const { username, password, canViewProposal, canViewFinancials } = body;

  if (username !== undefined && (typeof username !== "string" || username.length < 3 || username.length > 40)) {
    res.status(400).json({ error: "Username must be 3-40 characters" });
    return;
  }
  if (password !== undefined && (typeof password !== "string" || password.length < 8)) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }
  if (canViewProposal !== undefined && typeof canViewProposal !== "boolean") {
    res.status(400).json({ error: "canViewProposal must be boolean" });
    return;
  }
  if (canViewFinancials !== undefined && typeof canViewFinancials !== "boolean") {
    res.status(400).json({ error: "canViewFinancials must be boolean" });
    return;
  }

  const [client] = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.id, clientId));

  if (!client || !client.userId) {
    res.status(404).json({ error: "Client account not found" });
    return;
  }

  if (username !== undefined || password !== undefined) {
    const userUpdate: Record<string, unknown> = {};
    if (username !== undefined) userUpdate.username = username;
    if (password !== undefined) userUpdate.password = await bcrypt.hash(password as string, 10);
    await db.update(usersTable).set(userUpdate).where(eq(usersTable.id, client.userId));
  }

  const clientUpdate: Record<string, unknown> = {};
  if (canViewProposal !== undefined) clientUpdate.canViewProposal = canViewProposal;
  if (canViewFinancials !== undefined) clientUpdate.canViewFinancials = canViewFinancials;

  if (Object.keys(clientUpdate).length > 0) {
    await db.update(clientsTable).set(clientUpdate).where(eq(clientsTable.id, clientId));
  }

  const [updatedClient] = await db
    .select({
      id: clientsTable.id,
      name: clientsTable.name,
      email: clientsTable.email,
      userId: clientsTable.userId,
      canViewProposal: clientsTable.canViewProposal,
      canViewFinancials: clientsTable.canViewFinancials,
      username: usersTable.username,
    })
    .from(clientsTable)
    .innerJoin(usersTable, eq(usersTable.id, clientsTable.userId))
    .where(eq(clientsTable.id, clientId));

  res.json(updatedClient);
});

export default router;
