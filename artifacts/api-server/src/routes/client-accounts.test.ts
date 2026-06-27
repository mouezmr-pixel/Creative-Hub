import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express from "express";
import clientAccountsRouter from "../routes/client-accounts";
import bcrypt from "bcrypt";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.session = { userId: 1 };
    next();
  });
  app.use("/api", clientAccountsRouter);
  return app;
}

const mockClientAccount = {
  id: 1,
  name: "Test Client",
  email: "client@test.com",
  phone: "0555123456",
  userId: 2,
  canViewProposal: true,
  canViewFinancials: false,
  username: "testclient",
  role: "admin",
};

vi.mock("@workspace/db", () => ({
  clientsTable: { id: "id", userId: "userId", name: "name" },
  usersTable: { id: "id", username: "username" },
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => {
        const chain = {
          where: vi.fn(() => Promise.resolve([mockClientAccount])),
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(() => Promise.resolve([mockClientAccount])),
            })),
          })),
        };
        return chain;
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
  },
}));

vi.mock("bcrypt", () => ({
  default: { compare: vi.fn(() => Promise.resolve(true)), hash: vi.fn(() => Promise.resolve("$2b$10$hash")) },
  compare: vi.fn(() => Promise.resolve(true)),
  hash: vi.fn(() => Promise.resolve("$2b$10$hash")),
}));

describe("GET /api/client-accounts", () => {
  const app = createTestApp();

  it("returns 200 with client accounts list", async () => {
    const res = await request(app).get("/api/client-accounts");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("PATCH /api/client-accounts/:id", () => {
  const app = createTestApp();

  it("returns 400 for invalid client id", async () => {
    const res = await request(app)
      .patch("/api/client-accounts/invalid")
      .send({ canViewFinancials: true });

    expect(res.status).toBe(400);
  });

  it("returns 400 for short username", async () => {
    const res = await request(app)
      .patch("/api/client-accounts/1")
      .send({ username: "ab" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("3-40");
  });

  it("returns 400 for short password", async () => {
    const res = await request(app)
      .patch("/api/client-accounts/1")
      .send({ password: "short" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("8");
  });

  it("returns 400 for non-boolean canViewProposal", async () => {
    const res = await request(app)
      .patch("/api/client-accounts/1")
      .send({ canViewProposal: "yes" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("boolean");
  });

  it("returns 400 for non-boolean canViewFinancials", async () => {
    const res = await request(app)
      .patch("/api/client-accounts/1")
      .send({ canViewFinancials: "yes" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("boolean");
  });
});
