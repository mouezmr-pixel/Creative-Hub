import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express from "express";
import aiRouter from "../routes/ai";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.session = { userId: 1 };
    next();
  });
  app.use("/api", aiRouter);
  return app;
}

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn(() => ({
    messages: {
      create: vi.fn(() => Promise.resolve({
        content: [{ type: "text", text: "Mock proposal text" }],
      })),
    },
  })),
}));

describe("POST /api/ai/enhance-proposal", () => {
  const app = createTestApp();

  it("returns 401 when not authenticated", async () => {
    const unauthApp = express();
    unauthApp.use(express.json());
    unauthApp.use((req: any, _res, next) => {
      req.session = {};
      next();
    });
    unauthApp.use("/api", aiRouter);

    const res = await request(unauthApp)
      .post("/api/ai/enhance-proposal")
      .send({ originalIdea: "Wedding photo shoot" });

    expect(res.status).toBe(401);
  });

  it("returns 400 when originalIdea is missing", async () => {
    const res = await request(app)
      .post("/api/ai/enhance-proposal")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 when originalIdea is empty string", async () => {
    const res = await request(app)
      .post("/api/ai/enhance-proposal")
      .send({ originalIdea: "   " });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns mock proposal when AI client is not configured", async () => {
    const res = await request(app)
      .post("/api/ai/enhance-proposal")
      .send({ originalIdea: "Wedding photo shoot", language: "english" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("proposal");
  });
});
