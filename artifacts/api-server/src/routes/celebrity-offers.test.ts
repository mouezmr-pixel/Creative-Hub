import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express from "express";
import celebrityOffersRouter from "../routes/celebrity-offers";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.session = { userId: 1 };
    next();
  });
  app.use("/api", celebrityOffersRouter);
  return app;
}

const mockOffer = {
  id: 1,
  celebrityId: 1,
  title: "Sponsorship Deal",
  description: null,
  budget: null,
  status: "pending",
  scenario: null,
  script: null,
  idea: null,
  notes: null,
  role: "admin",
  createdAt: new Date(),
  updatedAt: new Date(),
};

vi.mock("@workspace/db", () => ({
  usersTable: { id: "id", createdAt: "createdAt", $inferSelect: {} },
  celebrityOffersTable: { id: "id", celebrityId: "celebrityId", createdAt: "createdAt", updatedAt: "updatedAt" },
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
          then: (onFulfilled: any) => Promise.resolve([mockOffer]).then(onFulfilled),
        };
        return chain;
      }),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([mockOffer])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([mockOffer])),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  },
}));

describe("GET /api/celebrity-offers", () => {
  const app = createTestApp();

  it("returns 200 with offers list", async () => {
    const res = await request(app).get("/api/celebrity-offers");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("POST /api/celebrity-offers", () => {
  const app = createTestApp();

  it("creates an offer and returns 201", async () => {
    const res = await request(app)
      .post("/api/celebrity-offers")
      .send({ celebrityId: 1, title: "New Offer" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("title");
  });

  it("returns 400 when celebrityId is missing", async () => {
    const res = await request(app)
      .post("/api/celebrity-offers")
      .send({ title: "No Celebrity" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 when title is missing", async () => {
    const res = await request(app)
      .post("/api/celebrity-offers")
      .send({ celebrityId: 1 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});

describe("GET /api/celebrity-offers/:id", () => {
  const app = createTestApp();

  it("returns 200 with offer data", async () => {
    const res = await request(app).get("/api/celebrity-offers/1");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("title");
  });

  it("returns 400 for invalid id", async () => {
    const res = await request(app).get("/api/celebrity-offers/invalid");
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/celebrity-offers/:id", () => {
  const app = createTestApp();

  it("returns 200 with updated offer", async () => {
    const res = await request(app)
      .patch("/api/celebrity-offers/1")
      .send({ title: "Updated Offer" });

    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/celebrity-offers/:id", () => {
  const app = createTestApp();

  it("returns 204 on success", async () => {
    const res = await request(app).delete("/api/celebrity-offers/1");
    expect(res.status).toBe(204);
  });

  it("returns 400 for invalid id", async () => {
    const res = await request(app).delete("/api/celebrity-offers/invalid");
    expect(res.status).toBe(400);
  });
});
