import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, clientsTable, usersTable } from "@workspace/db";
import {
  CreateClientBody,
  GetClientParams,
  UpdateClientBody,
  UpdateClientParams,
  DeleteClientParams,
  ListClientsQueryParams,
} from "@workspace/api-zod";
import bcrypt from "bcrypt";
import { requireAccess } from "../middlewares/auth";

const router: IRouter = Router();

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

async function formatClient(client: typeof clientsTable.$inferSelect) {
  let photographerName: string | null = null;
  let loginUsername: string | null = null;

  if (client.photographerId) {
    const [photographer] = await db
      .select({ name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, client.photographerId));
    photographerName = photographer?.name ?? null;
  }

  if (client.userId) {
    const [linkedUser] = await db
      .select({ username: usersTable.username })
      .from(usersTable)
      .where(eq(usersTable.id, client.userId));
    loginUsername = linkedUser?.username ?? null;
  }

  return {
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    originalIdea: client.originalIdea,
    aiGeneratedIdea: client.aiGeneratedIdea,
    proposedIdea: client.proposedIdea,
    photographerId: client.photographerId,
    photographerName,
    userId: client.userId,
    loginUsername,
    createdAt: client.createdAt.toISOString(),
  };
}

router.get("/clients", async (req, res): Promise<void> => {
  const user = await requireAccess(req, res, { allowedRoles: ["admin"] });
  if (!user) return;

  const qp = ListClientsQueryParams.safeParse(req.query);
  let query = db.select().from(clientsTable).$dynamic();

  if (qp.success && qp.data.photographerId != null) {
    query = query.where(eq(clientsTable.photographerId, qp.data.photographerId));
  }

  const clients = await query.orderBy(clientsTable.createdAt);
  const formatted = await Promise.all(clients.map(formatClient));
  res.json(formatted);
});

router.post("/clients", async (req, res): Promise<void> => {
  const user = await requireAccess(req, res, { allowedRoles: ["admin"] });
  if (!user) return;

  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { password, ...clientData } = parsed.data as any;

  let userId: number | null = null;

  if (password && password.trim()) {
    const username = generateUsername(clientData.name);
    const hashedPassword = await bcrypt.hash(password, 10);
    const [newUser] = await db
      .insert(usersTable)
      .values({
        username,
        password: hashedPassword,
        name: clientData.name,
        email: clientData.email || null,
        role: "client",
        canViewFinancials: false,
        canManageClients: false,
        canManageAllProjects: false,
        canInvoice: false,
        canViewLeads: false,
        canViewAccounting: false,
      })
      .returning();
    userId = newUser.id;
  }

  const [client] = await db
    .insert(clientsTable)
    .values({ ...clientData, userId })
    .returning();

  const formatted = await formatClient(client);
  res.status(201).json(formatted);
});

router.get("/clients/:id", async (req, res): Promise<void> => {
  const user = await requireAccess(req, res, { allowedRoles: ["admin"] });
  if (!user) return;

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetClientParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [client] = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.id, params.data.id));
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  const formatted = await formatClient(client);
  res.json(formatted);
});

router.patch("/clients/:id", async (req, res): Promise<void> => {
  const user = await requireAccess(req, res, { allowedRoles: ["admin"] });
  if (!user) return;

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateClientParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  const updateData: Partial<typeof clientsTable.$inferInsert> = {};
  if (parsed.data.name != null) updateData.name = parsed.data.name;
  if ("email" in parsed.data) updateData.email = parsed.data.email;
  if ("phone" in parsed.data) updateData.phone = parsed.data.phone;
  if ("originalIdea" in parsed.data) updateData.originalIdea = parsed.data.originalIdea;
  if ("aiGeneratedIdea" in parsed.data) updateData.aiGeneratedIdea = (parsed.data as any).aiGeneratedIdea;
  if ("proposedIdea" in parsed.data) updateData.proposedIdea = parsed.data.proposedIdea;
  if ("photographerId" in parsed.data) updateData.photographerId = parsed.data.photographerId;

  const [client] = await db
    .update(clientsTable)
    .set(updateData)
    .where(eq(clientsTable.id, params.data.id))
    .returning();
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  const formatted = await formatClient(client);
  res.json(formatted);
});

router.delete("/clients/:id", async (req, res): Promise<void> => {
  const user = await requireAccess(req, res, { allowedRoles: ["admin"] });
  if (!user) return;

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteClientParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(clientsTable).where(eq(clientsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
