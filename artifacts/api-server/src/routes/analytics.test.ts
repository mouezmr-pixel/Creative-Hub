import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express from "express";
import analyticsRouter from "../routes/analytics";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.session = { userId: 1 };
    next();
  });
  app.use("/api", analyticsRouter);
  return app;
}

const mockProject = {
  id: 1,
  title: "Test Project",
  clientId: 1,
  photographerId: 1,
  serviceId: null,
  status: "completed",
  progress: 100,
  startDate: null,
  deliveryDate: null,
  weTransferLink: null,
  expectedCost: "10000",
  finalCost: "10000",
  amountPaid: "5000",
  discount: null,
  currency: "DZD",
  originalClientIdea: null,
  aiGeneratedSuggestion: null,
  finalProposedIdea: null,
  proformaIssuedAt: null,
  finalInvoiceIssuedAt: new Date(),
  completedAt: new Date(),
  role: "admin",
  createdAt: new Date(),
};

vi.mock("@workspace/api-zod", () => ({
  GetAnalyticsSummaryQueryParams: { safeParse: () => ({ success: false }) },
  GetProjectsByStatusQueryParams: { safeParse: () => ({ success: false }) },
  GetDebtListQueryParams: { safeParse: () => ({ success: false }) },
}));

vi.mock("@workspace/db", () => ({
  projectsTable: {
    id: "id",
    clientId: "clientId",
    photographerId: "photographerId",
    status: "status",
    progress: "progress",
    createdAt: "createdAt",
    currency: "currency",
    finalCost: "finalCost",
    amountPaid: "amountPaid",
    discount: "discount",
    serviceId: "serviceId",
    finalInvoiceIssuedAt: "finalInvoiceIssuedAt",
    completedAt: "completedAt",
  },
  clientsTable: { id: "id", userId: "userId", photographerId: "photographerId" },
  usersTable: { id: "id", name: "name" },
  paymentHistoryTable: { id: "id", amount: "amount", currency: "currency", paymentDate: "paymentDate", projectId: "projectId" },
  expensesTable: { id: "id", amount: "amount", date: "date" },
  projectAssigneesTable: { projectId: "projectId", userId: "userId" },
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
          then: (onFulfilled: any) => Promise.resolve([mockProject]).then(onFulfilled),
        };
        return chain;
      }),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([mockProject])),
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
  },
}));

describe("GET /api/analytics/summary", () => {
  const app = createTestApp();

  it("returns 200 with analytics summary", async () => {
    const res = await request(app).get("/api/analytics/summary");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("totalProjects");
  });
});

describe("GET /api/analytics/projects-by-status", () => {
  const app = createTestApp();

  it("returns 200 with projects by status", async () => {
    const res = await request(app).get("/api/analytics/projects-by-status");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("GET /api/analytics/debt-list", () => {
  const app = createTestApp();

  it("returns 200 with debt list", async () => {
    const res = await request(app).get("/api/analytics/debt-list");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
