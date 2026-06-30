import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import { jsonErrorHandler } from "./error-handler";

vi.mock("../lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

function buildTestApp() {
  const app = express();

  app.get("/throws-sync", () => {
    throw new Error("boom from a sync handler");
  });

  app.get("/rejects-async", async () => {
    throw new Error("boom from an async handler");
  });

  app.get("/throws-with-status", () => {
    const err: any = new Error("not found, specifically");
    err.status = 404;
    throw err;
  });

  app.get("/throws-plain", () => {
    throw {};
  });

  app.use(jsonErrorHandler);
  return app;
}

describe("jsonErrorHandler", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it("catches a synchronous throw and returns JSON, not Express's default HTML error page", async () => {
    process.env.NODE_ENV = "test";
    const app = buildTestApp();
    const res = await request(app).get("/throws-sync");

    expect(res.status).toBe(500);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body).toEqual({ error: "boom from a sync handler" });
  });

  it("catches a rejected promise from an async handler (Express 5 auto-forwards it)", async () => {
    process.env.NODE_ENV = "test";
    const app = buildTestApp();
    const res = await request(app).get("/rejects-async");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "boom from an async handler" });
  });

  it("uses err.status when present instead of defaulting to 500", async () => {
    process.env.NODE_ENV = "test";
    const app = buildTestApp();
    const res = await request(app).get("/throws-with-status");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "not found, specifically" });
  });

  it("does not crash on an error with no message", async () => {
    process.env.NODE_ENV = "test";
    const app = buildTestApp();
    const res = await request(app).get("/throws-plain");

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("error");
  });

  it("hides the real message behind a generic one for 5xx errors in production", async () => {
    process.env.NODE_ENV = "production";
    const app = buildTestApp();
    const res = await request(app).get("/throws-sync");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Internal server error" });
  });

  it("still passes through the real message for non-5xx errors in production (deliberate 4xx, e.g. validation)", async () => {
    process.env.NODE_ENV = "production";
    const app = buildTestApp();
    const res = await request(app).get("/throws-with-status");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "not found, specifically" });
  });
});
