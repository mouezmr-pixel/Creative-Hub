import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express from "express";
import paymentsRouter from "../routes/payments";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.session = { userId: 1 };
    next();
  });
  app.use("/api", paymentsRouter);
  return app;
}

const mockPayment = {
  id: 1,
  projectId: 1,
  amount: "5000",
  currency: "DZD",
  paymentDate: "2025-01-15",
  paymentMethod: "bank_transfer",
  recordedBy: 1,
  reference: "INV-001",
  notes: null,
  role: "admin",
  canViewFinancials: true,
  canViewAccounting: true,
  createdAt: new Date(),
};

const mockProject = {
  id: 1,
  title: "Test Project",
  finalCost: "10000",
  currency: "DZD",
  clientId: 1,
  amountPaid: null,
  discount: null,
  status: "in_progress",
  createdAt: new Date(),
};

vi.mock("@workspace/db", () => ({
  paymentHistoryTable: {
    id: "id",
    projectId: "projectId",
    amount: "amount",
    currency: "currency",
    paymentDate: "paymentDate",
    recordedBy: "recordedBy",
    receiptNumber: "receiptNumber",
  },
  projectsTable: {
    id: "id",
    title: "title",
    currency: "currency",
    finalCost: "finalCost",
    clientId: "clientId",
    amountPaid: "amountPaid",
    discount: "discount",
    status: "status",
    createdAt: "createdAt",
  },
  usersTable: { id: "id", name: "name", username: "username" },
  clientsTable: { id: "id", userId: "userId", canViewFinancials: "canViewFinancials" },
  db: {
    select: vi.fn(() => ({
      from: vi.fn((table: any) => {
        const isPaymentTable = table && table.paymentDate !== undefined;
        const resolveValue = isPaymentTable
          ? [{
              payment: { ...mockPayment },
              projectTitle: "Test Project",
              projectCurrency: "DZD",
              recorderName: "Admin",
              recorderUsername: "admin",
            }]
          : [mockPayment];
        const chain: any = {
          where: vi.fn(() => chain),
          orderBy: vi.fn(() => chain),
          groupBy: vi.fn(() => chain),
          limit: vi.fn(() => chain),
          innerJoin: vi.fn(() => chain),
          leftJoin: vi.fn(() => chain),
          $dynamic: vi.fn(() => chain),
          then: (onFulfilled: any) => Promise.resolve(resolveValue).then(onFulfilled),
        };
        return chain;
      }),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([mockPayment])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([mockProject])),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
    transaction: vi.fn((fn: any) => fn({
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([mockPayment])),
        })),
      })),
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([{ total: "5000" }])),
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
    })),
  },
}));

describe("GET /api/payments", () => {
  const app = createTestApp();

  it("returns 200 with payments list", async () => {
    const res = await request(app).get("/api/payments");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("GET /api/payments/summary", () => {
  const app = createTestApp();

  it("returns 200 with summary", async () => {
    const res = await request(app).get("/api/payments/summary");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("GET /api/payments/project/:projectId", () => {
  const app = createTestApp();

  it("returns 400 for invalid project id", async () => {
    const res = await request(app).get("/api/payments/project/invalid");
    expect(res.status).toBe(400);
  });
});

describe("POST /api/payments", () => {
  const app = createTestApp();

  it("returns 400 when projectId is missing", async () => {
    const res = await request(app)
      .post("/api/payments")
      .send({ amount: 100 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 when amount is missing", async () => {
    const res = await request(app)
      .post("/api/payments")
      .send({ projectId: 1 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 for negative amount", async () => {
    const res = await request(app)
      .post("/api/payments")
      .send({ projectId: 1, amount: -100 });

    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/payments/:id", () => {
  const app = createTestApp();

  it("returns 400 for invalid id", async () => {
    const res = await request(app).delete("/api/payments/invalid");
    expect(res.status).toBe(400);
  });
});
