import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import usersRouter from "../routes/users";
import bcrypt from "bcrypt";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.session = { userId: 1 };
    next();
  });
  app.use("/api", usersRouter);
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

vi.mock("@workspace/db", () => ({
  usersTable: {
    id: "id",
    createdAt: "createdAt",
    $inferSelect: {},
    $inferInsert: {},
  },
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([mockAdminUser])),
        orderBy: vi.fn(() => Promise.resolve([mockAdminUser])),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([mockAdminUser])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([mockAdminUser])),
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

describe("GET /api/users", () => {
  const app = createTestApp();

  it("returns 200 with users list", async () => {
    const res = await request(app).get("/api/users");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("POST /api/users", () => {
  const app = createTestApp();

  it("creates a user and returns 201", async () => {
    const res = await request(app)
      .post("/api/users")
      .send({ username: "newuser", password: "pass1234", name: "New User", role: "photographer" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("username", "admin");
  });

  it("returns 400 when body is invalid", async () => {
    const res = await request(app).post("/api/users").send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});

describe("GET /api/users/:id", () => {
  const app = createTestApp();

  it("returns 200 with user data", async () => {
    const res = await request(app).get("/api/users/1");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("username");
  });

  it("returns 400 for invalid id", async () => {
    const res = await request(app).get("/api/users/invalid");
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/users/:id", () => {
  const app = createTestApp();

  it("returns 200 with updated user", async () => {
    const res = await request(app)
      .patch("/api/users/1")
      .send({ name: "Updated Name" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("username");
  });

  it("returns 400 for invalid id", async () => {
    const res = await request(app).patch("/api/users/invalid").send({ name: "Test" });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/users/:id", () => {
  const app = createTestApp();

  it("returns 200 on archive (soft-delete)", async () => {
    const res = await request(app).delete("/api/users/1");
    expect(res.status).toBe(200);
  });

  it("returns 400 for invalid id", async () => {
    const res = await request(app).delete("/api/users/invalid");
    expect(res.status).toBe(400);
  });
});

describe("POST /api/users/:id/unarchive", () => {
  const app = createTestApp();

  it("returns 200 on unarchive", async () => {
    const res = await request(app).post("/api/users/1/unarchive");
    expect(res.status).toBe(200);
  });

  it("returns 400 for invalid id", async () => {
    const res = await request(app).post("/api/users/invalid/unarchive");
    expect(res.status).toBe(400);
  });
});
