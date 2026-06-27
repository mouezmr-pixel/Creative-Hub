import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express from "express";
import campaignsRouter from "../routes/campaigns";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.session = { userId: 1 };
    next();
  });
  app.use("/api", campaignsRouter);
  return app;
}

const mockCampaign = {
  id: 1,
  name: "Summer Promo",
  nameAr: null,
  nameFr: null,
  description: null,
  descriptionAr: null,
  descriptionFr: null,
  type: "social_media",
  status: "draft",
  clientId: null,
  budget: null,
  startDate: null,
  endDate: null,
  coverImage: null,
  proposalContent: null,
  proposalContentAr: null,
  proposalContentFr: null,
  shared: false,
  sharedAt: null,
  role: "admin",
  createdAt: new Date(),
  updatedAt: new Date(),
};

vi.mock("@workspace/db", () => ({
  usersTable: { id: "id", createdAt: "createdAt", $inferSelect: {} },
  campaignsTable: { id: "id", createdAt: "createdAt", clientId: "clientId", updatedAt: "updatedAt" },
  campaignServicesTable: { id: "id", campaignId: "campaignId", serviceId: "serviceId" },
  campaignMilestonesTable: { id: "id", campaignId: "campaignId", order: "order" },
  clientsTable: { id: "id", name: "name", userId: "userId" },
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
          then: (onFulfilled: any) => Promise.resolve([mockCampaign]).then(onFulfilled),
        };
        return chain;
      }),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([mockCampaign])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([mockCampaign])),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  },
}));

describe("GET /api/campaigns", () => {
  const app = createTestApp();

  it("returns 200 with campaigns list", async () => {
    const res = await request(app).get("/api/campaigns");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("GET /api/campaigns/:id", () => {
  const app = createTestApp();

  it("returns 200 with campaign data", async () => {
    const res = await request(app).get("/api/campaigns/1");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("name");
  });

  it("returns 400 for invalid id", async () => {
    const res = await request(app).get("/api/campaigns/invalid");
    expect(res.status).toBe(400);
  });
});

describe("POST /api/campaigns", () => {
  const app = createTestApp();

  it("creates a campaign and returns 201", async () => {
    const res = await request(app)
      .post("/api/campaigns")
      .send({ name: "New Campaign", type: "social_media" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("name");
  });

  it("returns 400 when name is missing", async () => {
    const res = await request(app)
      .post("/api/campaigns")
      .send({ type: "social_media" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});

describe("PATCH /api/campaigns/:id", () => {
  const app = createTestApp();

  it("returns 200 with updated campaign", async () => {
    const res = await request(app)
      .patch("/api/campaigns/1")
      .send({ name: "Updated Campaign" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("name");
  });

  it("returns 400 for invalid id", async () => {
    const res = await request(app).patch("/api/campaigns/invalid").send({ name: "Test" });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/campaigns/:id", () => {
  const app = createTestApp();

  it("returns 204 on success", async () => {
    const res = await request(app).delete("/api/campaigns/1");
    expect(res.status).toBe(204);
  });

  it("returns 400 for invalid id", async () => {
    const res = await request(app).delete("/api/campaigns/invalid");
    expect(res.status).toBe(400);
  });
});

describe("POST /api/campaigns/:id/share", () => {
  const app = createTestApp();

  it("returns 200 with shared campaign", async () => {
    const res = await request(app).post("/api/campaigns/1/share");
    expect(res.status).toBe(200);
  });
});

describe("POST /api/campaigns/:id/unshare", () => {
  const app = createTestApp();

  it("returns 200 with unshared campaign", async () => {
    const res = await request(app).post("/api/campaigns/1/unshare");
    expect(res.status).toBe(200);
  });
});
