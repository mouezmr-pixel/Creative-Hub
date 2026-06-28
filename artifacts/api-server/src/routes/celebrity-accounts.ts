import { Router, type IRouter } from "express";
import { eq, isNotNull } from "drizzle-orm";
import { db, celebritiesTable, usersTable } from "@workspace/db";
import bcrypt from "bcrypt";
import { requireAccess } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/celebrity-accounts", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;

  const rows = await db
    .select({
      id: celebritiesTable.id,
      name: celebritiesTable.name,
      email: celebritiesTable.email,
      phone: celebritiesTable.phone,
      userId: celebritiesTable.userId,
      username: usersTable.username,
    })
    .from(celebritiesTable)
    .innerJoin(usersTable, eq(usersTable.id, celebritiesTable.userId))
    .where(isNotNull(celebritiesTable.userId))
    .orderBy(celebritiesTable.name);

  res.json(rows);
});

router.patch("/celebrity-accounts/:id", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;

  const celebrityId = parseInt(req.params.id, 10);
  if (isNaN(celebrityId)) {
    res.status(400).json({ error: "Invalid celebrity id" });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const { username, password } = body;

  if (username !== undefined && (typeof username !== "string" || username.length < 3 || username.length > 40)) {
    res.status(400).json({ error: "Username must be 3-40 characters" });
    return;
  }
  if (password !== undefined && (typeof password !== "string" || password.length < 8)) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const [celebrity] = await db
    .select()
    .from(celebritiesTable)
    .where(eq(celebritiesTable.id, celebrityId));

  if (!celebrity || !celebrity.userId) {
    res.status(404).json({ error: "Celebrity account not found" });
    return;
  }

  if (username !== undefined || password !== undefined) {
    const userUpdate: Record<string, unknown> = {};
    if (username !== undefined) userUpdate.username = username;
    if (password !== undefined) userUpdate.password = await bcrypt.hash(password as string, 10);
    await db.update(usersTable).set(userUpdate).where(eq(usersTable.id, celebrity.userId));
  }

  const [updatedCelebrity] = await db
    .select({
      id: celebritiesTable.id,
      name: celebritiesTable.name,
      email: celebritiesTable.email,
      userId: celebritiesTable.userId,
      username: usersTable.username,
    })
    .from(celebritiesTable)
    .innerJoin(usersTable, eq(usersTable.id, celebritiesTable.userId))
    .where(eq(celebritiesTable.id, celebrityId));

  res.json(updatedCelebrity);
});

export default router;
