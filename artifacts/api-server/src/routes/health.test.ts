import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express from "express";
import healthRouter from "../routes/health";

vi.mock("@workspace/api-zod", () => ({
  HealthCheckResponse: {
    parse: (data: any) => data,
  },
}));

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/", healthRouter);
  return app;
}

describe("GET /healthz", () => {
  const app = createTestApp();

  it("returns 200 with status ok", async () => {
    const res = await request(app).get("/healthz");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
