import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express from "express";
import accountingRouter from "../routes/accounting";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.session = { userId: 1 };
    next();
  });
  app.use("/api", accountingRouter);
  return app;
}

const mockExpense = {
  id: 1,
  category: "creative_payout",
  amount: "5000",
  date: "2025-01-15",
  paymentDate: "2025-01-15",
  description: "Commission payout",
  reference: null,
  role: "admin",
  canViewFinancials: true,
  canViewAccounting: true,
  createdAt: new Date(),
};

const mockRecurringExpense = {
  id: 1,
  name: "Office Rent",
  category: "overhead",
  amount: "20000",
  description: null,
  isActive: true,
  role: "admin",
  canViewFinancials: true,
  canViewAccounting: true,
  createdAt: new Date(),
};

vi.mock("@workspace/db", () => ({
  expensesTable: { id: "id", date: "date", reference: "reference", category: "category", amount: "amount", description: "description" },
  projectsTable: { id: "id", serviceId: "serviceId", title: "title", currency: "currency", finalCost: "finalCost", amountPaid: "amountPaid", discount: "discount", status: "status", completedAt: "completedAt", createdAt: "createdAt" },
  servicesTable: { id: "id", title: "title" },
  usersTable: { id: "id", name: "name", role: "role" },
  projectAssigneesTable: { id: "id", userId: "userId", projectId: "projectId", commissionType: "commissionType", commissionValue: "commissionValue" },
  paymentHistoryTable: { id: "id", amount: "amount", currency: "currency", paymentDate: "paymentDate", projectId: "projectId" },
  recurringExpensesTable: { id: "id", name: "name", isActive: "isActive", category: "category", amount: "amount" },
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
          then: (onFulfilled: any) => Promise.resolve([mockExpense]).then(onFulfilled),
        };
        return chain;
      }),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([mockExpense])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([mockExpense])),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  },
}));

describe("GET /api/expenses", () => {
  const app = createTestApp();

  it("returns 200 with expenses list", async () => {
    const res = await request(app).get("/api/expenses");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("POST /api/expenses", () => {
  const app = createTestApp();

  it("returns 400 when category is missing", async () => {
    const res = await request(app)
      .post("/api/expenses")
      .send({ amount: 500, date: "2025-01-15" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 when amount is missing", async () => {
    const res = await request(app)
      .post("/api/expenses")
      .send({ category: "overhead", date: "2025-01-15" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when date is missing", async () => {
    const res = await request(app)
      .post("/api/expenses")
      .send({ category: "overhead", amount: 500 });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/recurring-expenses", () => {
  const app = createTestApp();

  it("returns 200 with recurring expenses list", async () => {
    const res = await request(app).get("/api/recurring-expenses");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("POST /api/recurring-expenses", () => {
  const app = createTestApp();

  it("returns 400 when name is missing", async () => {
    const res = await request(app)
      .post("/api/recurring-expenses")
      .send({ category: "overhead", amount: 500 });

    expect(res.status).toBe(400);
  });

  it("returns 400 when category is missing", async () => {
    const res = await request(app)
      .post("/api/recurring-expenses")
      .send({ name: "Office Rent", amount: 500 });

    expect(res.status).toBe(400);
  });

  it("returns 400 when amount is missing", async () => {
    const res = await request(app)
      .post("/api/recurring-expenses")
      .send({ name: "Office Rent", category: "overhead" });

    expect(res.status).toBe(400);
  });
});

describe("POST /api/accounting/process-salaries/:month", () => {
  const app = createTestApp();

  it("returns 400 for invalid month format", async () => {
    const res = await request(app)
      .post("/api/accounting/process-salaries/invalid");

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});

describe("POST /api/accounting/process-recurring/:month", () => {
  const app = createTestApp();

  it("returns 400 for invalid month format", async () => {
    const res = await request(app)
      .post("/api/accounting/process-recurring/invalid");

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});

describe("GET /api/accounting/summary", () => {
  const app = createTestApp();

  it("returns 200 with summary data", async () => {
    const res = await request(app).get("/api/accounting/summary");
    expect(res.status).toBe(200);
  });
});
