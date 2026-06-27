import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express from "express";
import leadsRouter from "../routes/leads";
import bcrypt from "bcrypt";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.session = { userId: 1 };
    next();
  });
  app.use("/api", leadsRouter);
  return app;
}

const mockAdminUser = {
  id: 1,
  username: "admin",
  password: "$2b$10$hash",
  name: "Admin",
  email: "admin@test.com",
  role: "admin" as const,
  profession: null,
  archivedAt: null,
  createdAt: new Date(),
  canViewFinancials: false,
  canManageClients: false,
  canManageAllProjects: false,
  canInvoice: false,
  canViewLeads: true,
  canViewAccounting: false,
};

const mockLead = {
  id: 1,
  name: "Test Lead",
  phone: "0555123456",
  email: "lead@test.com",
  estimatedValue: "5000",
  source: "instagram",
  status: "new",
  notes: null,
  projectName: null,
  serviceId: null,
  lostReason: null,
  wonMonth: null,
  role: "admin",
  createdAt: new Date(),
};

vi.mock("@workspace/db", () => ({
  leadsTable: { id: "id", createdAt: "createdAt", serviceId: "serviceId", lostReason: "lostReason" },
  clientsTable: { id: "id", userId: "userId" },
  projectsTable: { id: "id" },
  usersTable: { id: "id", name: "name", role: "role" },
  servicesTable: { id: "id", title: "title" },
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
          then: (onFulfilled: any) => Promise.resolve([mockLead]).then(onFulfilled),
        };
        return chain;
      }),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([mockLead])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([mockLead])),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  },
}));

vi.mock("bcrypt", () => ({
  default: { compare: vi.fn(() => Promise.resolve(true)), hash: vi.fn(() => Promise.resolve("$2b$10$hash")) },
  compare: vi.fn(() => Promise.resolve(true)),
  hash: vi.fn(() => Promise.resolve("$2b$10$hash")),
}));

describe("GET /api/leads", () => {
  const app = createTestApp();

  it("returns 200 with leads list", async () => {
    const res = await request(app).get("/api/leads");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("POST /api/leads", () => {
  const app = createTestApp();

  it("creates a lead and returns 201", async () => {
    const res = await request(app)
      .post("/api/leads")
      .send({ name: "Test Lead", source: "instagram" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("name");
  });

  it("returns 400 when name is missing", async () => {
    const res = await request(app)
      .post("/api/leads")
      .send({ source: "instagram" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 when source is missing", async () => {
    const res = await request(app)
      .post("/api/leads")
      .send({ name: "Test Lead" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});

describe("GET /api/leads/:id", () => {
  const app = createTestApp();

  it("returns 200 with lead data", async () => {
    const res = await request(app).get("/api/leads/1");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("name");
  });
});

describe("PATCH /api/leads/:id", () => {
  const app = createTestApp();

  it("returns 200 with updated lead", async () => {
    const res = await request(app)
      .patch("/api/leads/1")
      .send({ name: "Updated Lead" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("name");
  });
});

describe("DELETE /api/leads/:id", () => {
  const app = createTestApp();

  it("returns 204 on success", async () => {
    const res = await request(app).delete("/api/leads/1");
    expect(res.status).toBe(204);
  });
});

describe("GET /api/leads/lost-reasons", () => {
  const app = createTestApp();

  it("returns 200 with lost reasons list", async () => {
    const res = await request(app).get("/api/leads/lost-reasons");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
