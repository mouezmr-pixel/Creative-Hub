import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express from "express";
import settingsRouter from "../routes/settings";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.session = { userId: 1 };
    next();
  });
  app.use("/api", settingsRouter);
  return app;
}

function createAnonymousTestApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.session = {}; // no userId — simulates a logged-out / anonymous request
    next();
  });
  app.use("/api", settingsRouter);
  return app;
}

const mockSettings = {
  id: 1,
  name: "Creative Studio",
  description: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  taxId: "",
  invoicePrefix: "INV-",
  proformaPrefix: "PF-",
  paymentTerms: "",
  invoiceFooter: "",
  invoiceNotes: "",
  logoUrl: "",
  stampUrl: "",
  showStamp: true,
  showSignature: true,
  role: "admin",
  createdAt: new Date(),
  updatedAt: new Date(),
};

vi.mock("@workspace/db", () => ({
  usersTable: { id: "id", createdAt: "createdAt", $inferSelect: {} },
  studioSettingsTable: { id: "id" },
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => {
        const chain = {
          where: vi.fn(() => Promise.resolve([mockSettings])),
          orderBy: vi.fn(() => Promise.resolve([mockSettings])),
        };
        return chain;
      }),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([mockSettings])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([mockSettings])),
        })),
      })),
    })),
  },
}));

vi.mock("@workspace/db/schema/studio-settings", () => ({
  updateStudioSettingsSchema: {
    safeParse: (data: any) => ({
      success: !!data.name,
      data,
      error: { message: "Invalid settings" },
    }),
  },
}));

describe("GET /api/settings", () => {
  const app = createTestApp();

  it("returns 200 with settings", async () => {
    const res = await request(app).get("/api/settings");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("name");
  });

  it("returns the full settings shape (including address/phone/taxId) for an authenticated request", async () => {
    const res = await request(app).get("/api/settings");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("address");
    expect(res.body).toHaveProperty("phone");
    expect(res.body).toHaveProperty("taxId");
    expect(res.body).toHaveProperty("invoicePrefix");
  });
});

describe("GET /api/settings (anonymous)", () => {
  const app = createAnonymousTestApp();

  it("returns 200 (not 401) so the public login/landing pages still work", async () => {
    const res = await request(app).get("/api/settings");
    expect(res.status).toBe(200);
  });

  it("returns only the minimal public subset — no address/phone/taxId/invoice data", async () => {
    const res = await request(app).get("/api/settings");
    expect(res.body).toHaveProperty("name");
    expect(res.body).not.toHaveProperty("address");
    expect(res.body).not.toHaveProperty("phone");
    expect(res.body).not.toHaveProperty("taxId");
    expect(res.body).not.toHaveProperty("invoicePrefix");
    expect(res.body).not.toHaveProperty("stampUrl");
  });
});

describe("PUT /api/settings", () => {
  const app = createTestApp();

  it("returns 200 with updated settings", async () => {
    const res = await request(app)
      .put("/api/settings")
      .send({ name: "Updated Studio" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("name");
  });

  it("returns 400 for invalid body", async () => {
    const res = await request(app)
      .put("/api/settings")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});

describe("POST /api/settings/upload", () => {
  const app = createTestApp();

  it("returns 400 when no image data provided", async () => {
    const res = await request(app)
      .post("/api/settings/upload")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 for invalid image format", async () => {
    const res = await request(app)
      .post("/api/settings/upload")
      .send({ data: "not-a-valid-data-url" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});
