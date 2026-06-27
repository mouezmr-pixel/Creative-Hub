import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import authRouter from "../routes/auth";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(
    session({
      secret: "test-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false },
    })
  );
  app.use("/api", authRouter);
  return app;
}

const mockUser = {
  id: 1,
  username: "admin",
  password: "$2b$10$hash",
  name: "Admin",
  email: "admin@test.com",
  role: "admin",
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

let dbWhereResult: any[] = [];

vi.mock("@workspace/db", () => ({
  usersTable: {},
  clientsTable: {},
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve(dbWhereResult)),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([mockUser])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([mockUser])),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
    execute: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock("bcrypt", () => ({
  default: { compare: vi.fn(() => Promise.resolve(true)), hash: vi.fn(() => Promise.resolve("$2b$10$hash")) },
  compare: vi.fn(() => Promise.resolve(true)),
  hash: vi.fn(() => Promise.resolve("$2b$10$hash")),
}));

describe("POST /api/auth/login", () => {
  const app = createTestApp();

  it("returns 200 with user data on valid credentials", async () => {
    dbWhereResult = [mockUser];

    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "admin", password: "admin123" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("user");
    expect(res.body.user).toHaveProperty("username", "admin");
  });

  it("returns 400 when body is empty", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 401 with invalid password", async () => {
    dbWhereResult = [mockUser];
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(false);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "admin", password: "wrongpass" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid credentials");
  });

  it("returns 401 when user not found", async () => {
    dbWhereResult = [];

    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "nonexistent", password: "pass" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid credentials");
  });
});

describe("POST /api/auth/logout", () => {
  const app = createTestApp();

  it("returns 200 on logout", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Logged out successfully");
  });
});

describe("GET /api/auth/me", () => {
  const app = createTestApp();

  it("returns 401 when not authenticated", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Not authenticated");
  });
});
