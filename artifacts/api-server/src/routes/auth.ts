import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, clientsTable } from "@workspace/db";
import { LoginBody } from "@workspace/api-zod";
import bcrypt from "bcrypt";

const router: IRouter = Router();

function formatUser(user: typeof usersTable.$inferSelect, clientData?: { canViewProposal: boolean; canViewFinancials: boolean } | null) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email ?? null,
    role: user.role,
    profession: user.profession ?? null,
    canViewFinancials: clientData != null ? clientData.canViewFinancials : user.canViewFinancials,
    canManageClients: user.canManageClients,
    canManageAllProjects: user.canManageAllProjects,
    canInvoice: user.canInvoice,
    canViewLeads: user.canViewLeads,
    canViewAccounting: user.canViewAccounting,
    canViewProposal: clientData != null ? clientData.canViewProposal : true,
    createdAt: user.createdAt.toISOString(),
  };
}

async function getClientData(userId: number) {
  if (!userId) return null;
  const [row] = await db
    .select({ canViewProposal: clientsTable.canViewProposal, canViewFinancials: clientsTable.canViewFinancials })
    .from(clientsTable)
    .where(eq(clientsTable.userId, userId));
  return row ?? null;
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password } = parsed.data;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username));

  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  // Archived (soft-deleted) users cannot log in
  if ((user as any).archivedAt != null) {
    res.status(401).json({ error: "This account has been deactivated" });
    return;
  }

  // Support both bcrypt hashes and legacy plaintext passwords
  const isValidPassword = user.password.startsWith("$2")
    ? await bcrypt.compare(password, user.password)
    : user.password === password;

  if (!isValidPassword) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  (req.session as unknown as Record<string, unknown>).userId = user.id;

  const clientData = user.role === "client" ? await getClientData(user.id) : null;

  req.session.save((err) => {
    if (err) {
      res.status(500).json({ error: "Session error" });
      return;
    }
    res.json({
      user: formatUser(user, clientData),
      message: "Logged in successfully",
    });
  });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  req.session.destroy(() => {
    res.json({ message: "Logged out successfully" });
  });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const sessionData = req.session as unknown as Record<string, unknown>;
  const userId = sessionData.userId as number | undefined;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user || (user as any).archivedAt != null) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const clientData = user.role === "client" ? await getClientData(user.id) : null;
  res.json(formatUser(user, clientData));
});

export default router;
