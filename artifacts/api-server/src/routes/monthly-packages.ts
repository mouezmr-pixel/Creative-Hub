import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import {
  db,
  monthlyPackagesTable,
  monthlyPackageItemsTable,
  monthlyGenerationLogTable,
  projectsTable,
  projectMilestonesTable,
} from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";

(async () => {
  try {
    // Fix schema mismatches from previous migrations
    await db.execute(sql.raw(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='monthly_generation_log' AND column_name='generated_at') THEN
          ALTER TABLE monthly_generation_log RENAME COLUMN generated_at TO created_at;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='monthly_generation_log' AND column_name='project_id' AND is_nullable='YES') THEN
          ALTER TABLE monthly_generation_log ALTER COLUMN project_id SET NOT NULL;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='monthly_package_items' AND column_name='price' AND data_type='numeric') THEN
          ALTER TABLE monthly_package_items ALTER COLUMN price TYPE TEXT;
        END IF;
      END $$;
    `));
    await db.execute(sql`ALTER TABLE celebrities ADD COLUMN IF NOT EXISTS phone TEXT`);
    await db.execute(sql`ALTER TABLE celebrities ADD COLUMN IF NOT EXISTS email TEXT`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS monthly_packages (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
        currency TEXT NOT NULL DEFAULT 'TND',
        notes TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS monthly_package_items (
        id SERIAL PRIMARY KEY,
        package_id INTEGER NOT NULL REFERENCES monthly_packages(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        price TEXT NOT NULL,
        display_order INTEGER NOT NULL DEFAULT 0
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS monthly_generation_log (
        id SERIAL PRIMARY KEY,
        package_id INTEGER NOT NULL REFERENCES monthly_packages(id) ON DELETE CASCADE,
        project_id INTEGER NOT NULL,
        month TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(package_id, month)
      )
    `);
    console.log("✅ Tables verified successfully");
  } catch (e: any) {
    console.error("❌ Migration error:", e.message);
  }
})();

const router: IRouter = Router();

function monthLabel(month: string): string {
  const [year, m] = month.split("-");
  const names = [
    "جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان",
    "جويلية", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
  ];
  return `${names[parseInt(m) - 1]} ${year}`;
}

async function fetchClientName(clientId: number): Promise<string | null> {
  const { clientsTable } = await import("@workspace/db");
  const [row] = await db
    .select({ name: clientsTable.name })
    .from(clientsTable)
    .where(eq(clientsTable.id, clientId));
  return row?.name ?? null;
}

async function fetchFullPackage(id: number) {
  const [pkg] = await db
    .select()
    .from(monthlyPackagesTable)
    .where(eq(monthlyPackagesTable.id, id));
  if (!pkg) return null;

  const items = await db
    .select()
    .from(monthlyPackageItemsTable)
    .where(eq(monthlyPackageItemsTable.packageId, id))
    .orderBy(monthlyPackageItemsTable.displayOrder);

  const logs = await db
    .select({ month: monthlyGenerationLogTable.month })
    .from(monthlyGenerationLogTable)
    .where(eq(monthlyGenerationLogTable.packageId, id));

  const totalBudget = items.reduce((sum, i) => sum + parseFloat(i.price), 0);
  const clientName = await fetchClientName(pkg.clientId);

  return {
    ...pkg,
    clientName,
    totalBudget,
    items: items.map((i) => ({ ...i, price: parseFloat(i.price) })),
    generatedMonths: logs.map((l) => l.month),
  };
}

async function generateForPackage(packageId: number, month: string) {
  try {
    const pkg = await fetchFullPackage(packageId);
    if (!pkg || !pkg.isActive) return null;

    const [existing] = await db
      .select()
      .from(monthlyGenerationLogTable)
      .where(
        and(
          eq(monthlyGenerationLogTable.packageId, packageId),
          eq(monthlyGenerationLogTable.month, month),
        ),
      );
    if (existing) return "skipped";

    const [project] = await db
      .insert(projectsTable)
      .values({
        title: `${pkg.title} - ${monthLabel(month)}`,
        clientId: pkg.clientId,
        serviceId: pkg.serviceId ?? undefined,
        expectedCost: String(pkg.totalBudget),
        currency: pkg.currency,
        status: "pending",
        startDate: `${month}-01`,
        originalClientIdea: pkg.notes ?? "",
      } as any)
      .returning();

    if (pkg.items.length > 0) {
      await db.insert(projectMilestonesTable).values(
        pkg.items.map((item, idx) => ({
          projectId: project.id,
          title: item.title,
          isCompleted: false,
          order: idx,
        } as any)),
      );
    }

    await db.insert(monthlyGenerationLogTable).values({
      packageId,
      projectId: project.id,
      month,
    });

    return project;
  } catch (err) {
    console.error(`[generateForPackage] Failed to generate for package ${packageId}, month ${month}:`, err);
    throw err;
  }
}

// generate ALL active packages
router.post("/monthly-packages/generate-all", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const { month } = req.body;

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ error: "month must be in YYYY-MM format" });
    return;
  }

  const active = await db
    .select()
    .from(monthlyPackagesTable)
    .where(eq(monthlyPackagesTable.isActive, true));

  const results = await Promise.all(active.map((p) => generateForPackage(p.id, month)));
  const created = results.filter((r) => r !== null && r !== "skipped");
  const skipped = results.filter((r) => r === "skipped").length;

  res.json({ month, created: created.length, skipped, projects: created });
});

router.get("/monthly-packages", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const pkgs = await db.select().from(monthlyPackagesTable).orderBy(monthlyPackagesTable.createdAt);
  const full = await Promise.all(pkgs.map((p) => fetchFullPackage(p.id)));
  res.json(full.filter(Boolean));
});

router.post("/monthly-packages", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const { clientId, serviceId, title, currency, isActive, notes, items } = req.body;

  if (!clientId || !title || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "clientId, title, and at least one item are required" });
    return;
  }

  const [pkg] = await db
    .insert(monthlyPackagesTable)
    .values({
      clientId,
      serviceId: serviceId ?? null,
      title,
      currency: currency ?? "DZD",
      isActive: isActive ?? true,
      notes: notes ?? null,
    })
    .returning();

  await db.insert(monthlyPackageItemsTable).values(
    items.map((item: any, idx: number) => ({
      packageId: pkg.id,
      title: item.title,
      price: String(item.price),
      displayOrder: item.displayOrder ?? idx,
    })),
  );

  res.status(201).json(await fetchFullPackage(pkg.id));
});

router.get("/monthly-packages/:id", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(req.params.id, 10);
  const pkg = await fetchFullPackage(id);
  if (!pkg) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(pkg);
});

router.patch("/monthly-packages/:id", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(req.params.id, 10);
  const { title, serviceId, currency, isActive, notes, items } = req.body;

  const updateData: any = { updatedAt: new Date() };
  if (title !== undefined) updateData.title = title;
  if (serviceId !== undefined) updateData.serviceId = serviceId;
  if (currency !== undefined) updateData.currency = currency;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (notes !== undefined) updateData.notes = notes;

  await db
    .update(monthlyPackagesTable)
    .set(updateData)
    .where(eq(monthlyPackagesTable.id, id));

  if (Array.isArray(items)) {
    await db
      .delete(monthlyPackageItemsTable)
      .where(eq(monthlyPackageItemsTable.packageId, id));
    if (items.length > 0) {
      await db.insert(monthlyPackageItemsTable).values(
        items.map((item: any, idx: number) => ({
          packageId: id,
          title: item.title,
          price: String(item.price),
          displayOrder: item.displayOrder ?? idx,
        })),
      );
    }
  }

  res.json(await fetchFullPackage(id));
});

router.delete("/monthly-packages/:id", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(req.params.id, 10);
  await db.delete(monthlyPackagesTable).where(eq(monthlyPackagesTable.id, id));
  res.json({ message: "Deleted" });
});

// generate ONE package
router.post("/monthly-packages/:id/generate", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(req.params.id, 10);
  const { month } = req.body;

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ error: "month must be in YYYY-MM format" });
    return;
  }

  try {
    const result = await generateForPackage(id, month);
    if (result === null) {
      res.status(404).json({ error: "Package not found or inactive" });
      return;
    }
    if (result === "skipped") {
      res.status(409).json({ error: `Already generated for ${month}` });
      return;
    }

    res.status(201).json({ month, created: 1, skipped: 0, projects: [result] });
  } catch (err: any) {
    console.error(`[POST /monthly-packages/${id}/generate]`, err);
    res.status(500).json({
      error: "Internal server error during generation",
      detail: err?.detail || err?.message || String(err),
    });
  }
});

export default router;
