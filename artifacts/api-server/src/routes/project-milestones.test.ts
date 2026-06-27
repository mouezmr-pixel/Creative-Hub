import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express from "express";
import projectMilestonesRouter from "../routes/project-milestones";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.session = { userId: 1 };
    next();
  });
  app.use("/api", projectMilestonesRouter);
  return app;
}

const mockMilestone = {
  id: 1,
  projectId: 1,
  title: "Pre-shoot",
  titleAr: null,
  titleFr: null,
  description: null,
  order: 0,
  isCompleted: false,
  completedAt: null,
  role: "admin",
  createdAt: new Date(),
};

const mockProject = {
  id: 1,
  title: "Test Project",
  clientId: 1,
  photographerId: 1,
  serviceId: null,
  status: "pending",
  progress: 0,
  startDate: null,
  deliveryDate: null,
  weTransferLink: null,
  expectedCost: null,
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

vi.mock("@workspace/db", () => ({
  projectMilestonesTable: { id: "id", projectId: "projectId", order: "order", isCompleted: "isCompleted" },
  projectsTable: { id: "id", clientId: "clientId", photographerId: "photographerId", progress: "progress" },
  usersTable: { id: "id" },
  projectAssigneesTable: { projectId: "projectId", userId: "userId" },
  clientsTable: { id: "id", userId: "userId" },
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
          then: (onFulfilled: any) => Promise.resolve([mockMilestone]).then(onFulfilled),
        };
        return chain;
      }),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([mockMilestone])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([mockMilestone])),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  },
}));

describe("GET /api/projects/:id/milestones", () => {
  const app = createTestApp();

  it("returns 200 with milestones list", async () => {
    const res = await request(app).get("/api/projects/1/milestones");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("returns 400 for invalid project id", async () => {
    const res = await request(app).get("/api/projects/invalid/milestones");
    expect(res.status).toBe(400);
  });
});

describe("POST /api/projects/:id/milestones", () => {
  const app = createTestApp();

  it("creates a milestone and returns 201", async () => {
    const res = await request(app)
      .post("/api/projects/1/milestones")
      .send({ title: "New Milestone" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("title");
  });

  it("returns 400 when title is missing", async () => {
    const res = await request(app)
      .post("/api/projects/1/milestones")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 for invalid project id", async () => {
    const res = await request(app)
      .post("/api/projects/invalid/milestones")
      .send({ title: "Test" });

    expect(res.status).toBe(400);
  });
});

describe("POST /api/projects/:id/milestones/bulk", () => {
  const app = createTestApp();

  it("returns 400 when milestones array is empty", async () => {
    const res = await request(app)
      .post("/api/projects/1/milestones/bulk")
      .send({ milestones: [] });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 when milestones is not an array", async () => {
    const res = await request(app)
      .post("/api/projects/1/milestones/bulk")
      .send({ milestones: "not-array" });

    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/projects/:id/milestones/:milestoneId", () => {
  const app = createTestApp();

  it("returns 400 for invalid project id", async () => {
    const res = await request(app)
      .patch("/api/projects/invalid/milestones/1")
      .send({ title: "Updated" });

    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/projects/:id/milestones/:milestoneId", () => {
  const app = createTestApp();

  it("returns 204 on success", async () => {
    const res = await request(app).delete("/api/projects/1/milestones/1");
    expect(res.status).toBe(204);
  });

  it("returns 400 for invalid project id", async () => {
    const res = await request(app).delete("/api/projects/invalid/milestones/1");
    expect(res.status).toBe(400);
  });
});
