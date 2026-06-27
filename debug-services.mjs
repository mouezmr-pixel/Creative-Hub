const { describe, it, expect, vi } = require("vitest");
const request = require("supertest");
const express = require("express");
const servicesRouter = require("./services").default;

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.session = { userId: 1 };
    next();
  });
  app.use("/api", servicesRouter);
  app.use((err, req, res, next) => {
    console.error("ERROR CAUGHT:", err.stack || err.message || err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  });
  return app;
}

async function main() {
  const app = createTestApp();
  const res = await request(app).get("/api/services");
  console.log("Status:", res.status);
  console.log("Body:", JSON.stringify(res.body, null, 2));
}

main().catch(console.error);
