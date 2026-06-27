import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express from "express";
import celebritiesRouter from "../routes/celebrities";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.session = { userId: 1 };
    next();
  });
  app.use("/api", celebritiesRouter);
  return app;
}

const mockCelebrity = {
  id: 1,
  name: "Test Celebrity",
  phone: null,
  email: null,
  photoUrl: null,
  ageGroups: null,
  birthDate: null,
  interests: null,
  tags: null,
  minPrice: null,
  maxPrice: null,
  bio: null,
  archivedAt: null,
  role: "admin",
  createdAt: new Date(),
};

vi.mock("@workspace/db", () => ({
  usersTable: { id: "id", createdAt: "createdAt", $inferSelect: {} },
  celebritiesTable: { id: "id", createdAt: "createdAt", archivedAt: "archivedAt" },
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
          then: (onFulfilled: any) => Promise.resolve([mockCelebrity]).then(onFulfilled),
        };
        return chain;
      }),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([mockCelebrity])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([mockCelebrity])),
        })),
      })),
    })),
  },
}));

describe("GET /api/celebrities", () => {
  const app = createTestApp();

  it("returns 200 with celebrities list", async () => {
    const res = await request(app).get("/api/celebrities");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("POST /api/celebrities", () => {
  const app = createTestApp();

  it("creates a celebrity and returns 201", async () => {
    const res = await request(app)
      .post("/api/celebrities")
      .send({ name: "New Celebrity" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("name");
  });

  it("returns 400 when name is missing", async () => {
    const res = await request(app)
      .post("/api/celebrities")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});

describe("GET /api/celebrities/:id", () => {
  const app = createTestApp();

  it("returns 200 with celebrity data", async () => {
    const res = await request(app).get("/api/celebrities/1");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("name");
  });

  it("returns 400 for invalid id", async () => {
    const res = await request(app).get("/api/celebrities/invalid");
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/celebrities/:id", () => {
  const app = createTestApp();

  it("returns 200 with updated celebrity", async () => {
    const res = await request(app)
      .patch("/api/celebrities/1")
      .send({ name: "Updated Name" });

    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/celebrities/:id", () => {
  const app = createTestApp();

  it("returns 200 on soft-delete", async () => {
    const res = await request(app).delete("/api/celebrities/1");
    expect(res.status).toBe(200);
  });

  it("returns 400 for invalid id", async () => {
    const res = await request(app).delete("/api/celebrities/invalid");
    expect(res.status).toBe(400);
  });
});
