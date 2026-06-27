import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express from "express";
import workflowTemplatesRouter from "../routes/workflow-templates";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.session = { userId: 1 };
    next();
  });
  app.use("/api", workflowTemplatesRouter);
  return app;
}

const mockTemplate = {
  id: 1,
  name: "Wedding Workflow",
  description: "Standard wedding workflow",
  role: "admin",
  createdAt: new Date(),
};

const mockMilestone = {
  id: 1,
  templateId: 1,
  title: "Pre-shoot Meeting",
  titleAr: null,
  titleFr: null,
  description: null,
  order: 0,
  role: "admin",
  createdAt: new Date(),
};

vi.mock("@workspace/db", () => ({
  usersTable: { id: "id", createdAt: "createdAt", $inferSelect: {} },
  workflowTemplatesTable: { id: "id" },
  templateMilestonesTable: { id: "id", templateId: "templateId", order: "order" },
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
          then: (onFulfilled: any) => Promise.resolve([mockTemplate]).then(onFulfilled),
        };
        return chain;
      }),
    })),
    insert: vi.fn(() => {
      let lastValues: any = null;
      return {
        values: vi.fn((v: any) => {
          lastValues = v;
          return {
            returning: vi.fn(() => {
              if (lastValues?.title !== undefined || lastValues?.templateId !== undefined) {
                return Promise.resolve([mockMilestone]);
              }
              return Promise.resolve([mockTemplate]);
            }),
          };
        }),
      };
    }),
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

describe("GET /api/workflow-templates", () => {
  const app = createTestApp();

  it("returns 200 with templates list", async () => {
    const res = await request(app).get("/api/workflow-templates");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("POST /api/workflow-templates", () => {
  const app = createTestApp();

  it("creates a template and returns 201", async () => {
    const res = await request(app)
      .post("/api/workflow-templates")
      .send({ name: "New Workflow" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("name");
  });

  it("returns 400 when name is missing", async () => {
    const res = await request(app)
      .post("/api/workflow-templates")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});

describe("PATCH /api/workflow-templates/:id", () => {
  const app = createTestApp();

  it("returns 200 with updated template", async () => {
    const res = await request(app)
      .patch("/api/workflow-templates/1")
      .send({ name: "Updated Workflow" });

    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/workflow-templates/:id", () => {
  const app = createTestApp();

  it("returns 204 on success", async () => {
    const res = await request(app).delete("/api/workflow-templates/1");
    expect(res.status).toBe(204);
  });
});

describe("POST /api/workflow-templates/:id/milestones", () => {
  const app = createTestApp();

  it("creates a milestone and returns 201", async () => {
    const res = await request(app)
      .post("/api/workflow-templates/1/milestones")
      .send({ title: "New Step" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("title");
  });

  it("returns 400 when title is missing", async () => {
    const res = await request(app)
      .post("/api/workflow-templates/1/milestones")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});
