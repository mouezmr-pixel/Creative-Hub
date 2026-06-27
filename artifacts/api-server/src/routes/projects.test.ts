import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express from "express";
import projectsRouter from "../routes/projects";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.session = { userId: 1 };
    next();
  });
  app.use("/api", projectsRouter);
  return app;
}

const mockProject = {
  id: 1,
  title: "Test Project",
  clientId: 1,
  photographerId: 1,
  serviceId: null,
  status: "pending",
  progress: 0,
  startDate: "2025-01-01",
  deliveryDate: "2025-02-01",
  weTransferLink: null,
  expectedCost: "10000",
  finalCost: null,
  amountPaid: null,
  discount: null,
  currency: "DZD",
  originalClientIdea: null,
  aiGeneratedSuggestion: null,
  finalProposedIdea: null,
  proformaIssuedAt: null,
  finalInvoiceIssuedAt: null,
  completedAt: null,
  role: "admin",
  createdAt: new Date(),
};

vi.mock("@workspace/api-zod", () => ({
  CreateProjectBody: { safeParse: (d: any) => ({ success: !!d.title, data: d, error: { message: "title is required" } }) },
  GetProjectParams: { safeParse: (d: any) => ({ success: d.id && !isNaN(d.id), data: d, error: { message: "Invalid id" } }) },
  UpdateProjectBody: { safeParse: (d: any) => ({ success: true, data: d }) },
  UpdateProjectParams: { safeParse: (d: any) => ({ success: d.id && !isNaN(d.id), data: d, error: { message: "Invalid id" } }) },
  DeleteProjectParams: { safeParse: (d: any) => ({ success: d.id && !isNaN(d.id), data: d, error: { message: "Invalid id" } }) },
  ListProjectsQueryParams: { safeParse: () => ({ success: false }) },
}));

vi.mock("@workspace/db", () => ({
  projectsTable: {
    id: "id",
    clientId: "clientId",
    photographerId: "photographerId",
    serviceId: "serviceId",
    status: "status",
    createdAt: "createdAt",
    currency: "currency",
    finalCost: "finalCost",
    amountPaid: "amountPaid",
    discount: "discount",
    title: "title",
  },
  clientsTable: { id: "id", name: "name", userId: "userId", canViewFinancials: "canViewFinancials" },
  usersTable: { id: "id", name: "name", role: "role", profession: "profession" },
  projectAssigneesTable: { id: "id", projectId: "projectId", userId: "userId", commissionType: "commissionType", commissionValue: "commissionValue" },
  servicesTable: { id: "id", title: "title" },
  expensesTable: { id: "id", reference: "reference" },
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
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([mockProject])),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  },
}));

describe("GET /api/projects", () => {
  const app = createTestApp();

  it("returns 200 with projects list", async () => {
    const res = await request(app).get("/api/projects");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("POST /api/projects", () => {
  const app = createTestApp();

  it("returns 400 when title is missing", async () => {
    const res = await request(app)
      .post("/api/projects")
      .send({ clientId: 1 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});

describe("GET /api/projects/:id", () => {
  const app = createTestApp();

  it("returns 400 for invalid id", async () => {
    const res = await request(app).get("/api/projects/invalid");
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/projects/:id", () => {
  const app = createTestApp();

  it("returns 400 for invalid id", async () => {
    const res = await request(app)
      .patch("/api/projects/invalid")
      .send({ title: "Updated" });

    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/projects/:id", () => {
  const app = createTestApp();

  it("returns 400 for invalid id", async () => {
    const res = await request(app).delete("/api/projects/invalid");
    expect(res.status).toBe(400);
  });
});

describe("POST /api/projects/:id/invoice", () => {
  const app = createTestApp();

  it("returns 400 for invalid invoice type", async () => {
    const res = await request(app)
      .post("/api/projects/1/invoice")
      .send({ type: "invalid_type" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});
