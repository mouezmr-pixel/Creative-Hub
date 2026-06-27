import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express from "express";
import clientsRouter from "../routes/clients";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.session = { userId: 1 };
    next();
  });
  app.use("/api", clientsRouter);
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
  canViewLeads: false,
  canViewAccounting: false,
};

const mockClientRecord = {
  id: 1,
  name: "Test Client",
  email: "test@example.com",
  phone: "0555123456",
  originalIdea: null,
  aiGeneratedIdea: null,
  proposedIdea: null,
  photographerId: null,
  userId: null,
  createdAt: new Date(),
};

vi.mock("@workspace/db", () => ({
  usersTable: {},
  clientsTable: {},
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
          then: (onFulfilled: any) => Promise.resolve([mockAdminUser]).then(onFulfilled),
        };
        return chain;
      }),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([mockClientRecord])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([mockClientRecord])),
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

describe("GET /api/clients", () => {
  const app = createTestApp();

  it("returns 200 with clients list", async () => {
    const res = await request(app).get("/api/clients");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("POST /api/clients", () => {
  const app = createTestApp();

  it("creates a client and returns 201", async () => {
    const res = await request(app)
      .post("/api/clients")
      .send({ name: "Test Client", email: "test@example.com", phone: "0555123456" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("name", "Test Client");
  });

  it("returns 400 when name is missing", async () => {
    const res = await request(app)
      .post("/api/clients")
      .send({ email: "test@example.com" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});

describe("GET /api/clients/:id", () => {
  const app = createTestApp();

  it("returns 200 with client data", async () => {
    const res = await request(app).get("/api/clients/1");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("name");
  });

  it("returns 400 for invalid id", async () => {
    const res = await request(app).get("/api/clients/invalid");
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/clients/:id", () => {
  const app = createTestApp();

  it("returns 204 on success", async () => {
    const res = await request(app).delete("/api/clients/1");
    expect(res.status).toBe(204);
  });
});
