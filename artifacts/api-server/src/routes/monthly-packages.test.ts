import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express from "express";
import monthlyPackagesRouter from "../routes/monthly-packages";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.session = { userId: 1 };
    next();
  });
  app.use("/api", monthlyPackagesRouter);
  return app;
}

const mockPackage = {
  id: 1,
  clientId: 1,
  serviceId: null,
  title: "Monthly Retainer",
  currency: "DZD",
  notes: null,
  isActive: true,
  role: "admin",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPackageItem = {
  id: 1,
  packageId: 1,
  title: "Social Media Management",
  price: "15000",
  displayOrder: 0,
  role: "admin",
};

vi.mock("@workspace/db", () => ({
  usersTable: { id: "id", createdAt: "createdAt", $inferSelect: {} },
  clientsTable: { id: "id", name: "name", userId: "userId" },
  monthlyPackagesTable: { id: "id", isActive: "isActive", createdAt: "createdAt", clientId: "clientId" },
  monthlyPackageItemsTable: { id: "id", packageId: "packageId", displayOrder: "displayOrder" },
  monthlyGenerationLogTable: { id: "id", packageId: "packageId", month: "month", projectId: "projectId" },
  projectsTable: { id: "id", status: "status" },
  projectMilestonesTable: { id: "id", projectId: "projectId" },
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => {
        const chain: any = {
          where: vi.fn(() => chain),
          orderBy: vi.fn(() => chain),
          groupBy: vi.fn(() => chain),
          limit: vi.fn(() => chain),
          innerJoin: vi.fn(() => chain),
          leftJoin: vi.fn(() => chain),
          $dynamic: vi.fn(() => chain),
          then: (onFulfilled: any) => Promise.resolve([mockPackage]).then(onFulfilled),
        };
        return chain;
      }),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn((v: any) => {
          if (Array.isArray(v) && v[0]?.title) return Promise.resolve([mockPackageItem]);
          return Promise.resolve([mockPackage]);
        }),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
    execute: vi.fn(() => Promise.resolve()),
  },
}));

describe("GET /api/monthly-packages", () => {
  const app = createTestApp();

  it("returns 200 with packages list", async () => {
    const res = await request(app).get("/api/monthly-packages");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("POST /api/monthly-packages", () => {
  const app = createTestApp();

  it("returns 400 when clientId is missing", async () => {
    const res = await request(app)
      .post("/api/monthly-packages")
      .send({ title: "Package", items: [{ title: "Item", price: 100 }] });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 when title is missing", async () => {
    const res = await request(app)
      .post("/api/monthly-packages")
      .send({ clientId: 1, items: [{ title: "Item", price: 100 }] });

    expect(res.status).toBe(400);
  });

  it("returns 400 when items is empty", async () => {
    const res = await request(app)
      .post("/api/monthly-packages")
      .send({ clientId: 1, title: "Package", items: [] });

    expect(res.status).toBe(400);
  });
});

describe("POST /api/monthly-packages/generate-all", () => {
  const app = createTestApp();

  it("returns 400 for invalid month format", async () => {
    const res = await request(app)
      .post("/api/monthly-packages/generate-all")
      .send({ month: "invalid" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});

describe("POST /api/monthly-packages/:id/generate", () => {
  const app = createTestApp();

  it("returns 400 for invalid month format", async () => {
    const res = await request(app)
      .post("/api/monthly-packages/1/generate")
      .send({ month: "invalid" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});

describe("DELETE /api/monthly-packages/:id", () => {
  const app = createTestApp();

  it("returns 200 on delete", async () => {
    const res = await request(app).delete("/api/monthly-packages/1");
    expect(res.status).toBe(200);
  });
});
