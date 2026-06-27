import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express from "express";
import servicesRouter from "../routes/services";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.session = { userId: 1 };
    next();
  });
  app.use("/api", servicesRouter);
  return app;
}

const mockService = {
  id: 1,
  title: "Test Service",
  description: null,
  price: "5000",
  role: "admin",
  createdAt: new Date(),
};

vi.mock("@workspace/db", () => ({
  usersTable: { id: "id", createdAt: "createdAt", $inferSelect: {} },
  servicesTable: { id: "id", createdAt: "createdAt" },
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([mockService])),
        orderBy: vi.fn(() => Promise.resolve([mockService])),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([mockService])),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  },
}));

describe("GET /api/services", () => {
  const app = createTestApp();

  it("returns 200 with services list", async () => {
    const res = await request(app).get("/api/services");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("POST /api/services", () => {
  const app = createTestApp();

  it("creates a service and returns 201", async () => {
    const res = await request(app)
      .post("/api/services")
      .send({ title: "New Service", price: 500 });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("title");
  });

  it("returns 400 when title is missing", async () => {
    const res = await request(app)
      .post("/api/services")
      .send({ price: 500 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 when price is missing", async () => {
    const res = await request(app)
      .post("/api/services")
      .send({ title: "No Price" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});

describe("DELETE /api/services/:id", () => {
  const app = createTestApp();

  it("returns 204 on success", async () => {
    const res = await request(app).delete("/api/services/1");
    expect(res.status).toBe(204);
  });

  it("returns 400 for invalid id", async () => {
    const res = await request(app).delete("/api/services/invalid");
    expect(res.status).toBe(400);
  });
});
