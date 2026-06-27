import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, servicesTable } from "@workspace/db";
import { requireAccess } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/services", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;

  const services = await db
    .select()
    .from(servicesTable)
    .orderBy(servicesTable.createdAt);

  res.json(services.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description ?? null,
    price: parseFloat(s.price as unknown as string),
    createdAt: s.createdAt,
  })));
});

router.post("/services", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;

  const { title, description, price } = req.body;
  if (!title || price === undefined || price === null) {
    res.status(400).json({ error: "title and price are required" });
    return;
  }

  const [created] = await db
    .insert(servicesTable)
    .values({ title, description: description ?? null, price: String(price) })
    .returning();

  res.status(201).json({
    id: created.id,
    title: created.title,
    description: created.description ?? null,
    price: parseFloat(created.price as unknown as string),
    createdAt: created.createdAt,
  });
});

router.delete("/services/:id", async (req, res): Promise<void> => {
  if (!(await requireAccess(req, res, { allowedRoles: ["admin"] }))) return;

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  await db.delete(servicesTable).where(eq(servicesTable.id, id));
  res.status(204).send();
});

export default router;
