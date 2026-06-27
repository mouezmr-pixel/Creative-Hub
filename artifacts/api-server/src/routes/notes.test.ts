import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express from "express";
import notesRouter from "../routes/notes";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.session = { userId: 1 };
    next();
  });
  app.use("/api", notesRouter);
  return app;
}

const mockNote = {
  id: 1,
  projectId: 1,
  authorId: 1,
  content: "Test note",
  role: "admin",
  createdAt: new Date(),
};

const mockProject = {
  id: 1,
  title: "Test Project",
  clientId: 1,
  photographerId: 1,
  serviceId: null,
  status: "pending",
  progress: 0,
  startDate: null,
  deliveryDate: null,
  weTransferLink: null,
  expectedCost: null,
  finalCost: null,
  amountPaid: null,
  discount: null,
  currency: "DZD",
  originalClientIdea: null,
  aiGeneratedSuggestion: null,
  finalProposedIdea: null,
  proformaIssuedAt: null,
  finalInvoiceIssuedAt: null,
  completedAt: null,
  role: "admin",
  createdAt: new Date(),
};

vi.mock("@workspace/db", () => ({
  notesTable: { id: "id", projectId: "projectId", authorId: "authorId", createdAt: "createdAt" },
  usersTable: { id: "id", name: "name", role: "role" },
  projectsTable: {
    id: "id",
    clientId: "clientId",
    photographerId: "photographerId",
    status: "status",
    createdAt: "createdAt",
  },
  projectAssigneesTable: { projectId: "projectId", userId: "userId" },
  clientsTable: { id: "id", userId: "userId" },
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
          then: (onFulfilled: any) => Promise.resolve([mockNote]).then(onFulfilled),
        };
        return chain;
      }),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([mockNote])),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  },
}));

vi.mock("@workspace/api-zod", () => ({
  ListProjectNotesParams: { safeParse: (d: any) => ({ success: d.id && !isNaN(d.id), data: d, error: { message: "Invalid id" } }) },
  CreateProjectNoteParams: { safeParse: (d: any) => ({ success: d.id && !isNaN(d.id), data: d, error: { message: "Invalid id" } }) },
  CreateProjectNoteBody: { safeParse: (d: any) => ({ success: !!d.content, data: d, error: { message: "content is required" } }) },
  DeleteNoteParams: { safeParse: (d: any) => ({ success: d.id && !isNaN(d.id), data: d, error: { message: "Invalid id" } }) },
}));

describe("GET /api/projects/:id/notes", () => {
  const app = createTestApp();

  it("returns 200 with notes list", async () => {
    const res = await request(app).get("/api/projects/1/notes");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("returns 400 for invalid project id", async () => {
    const res = await request(app).get("/api/projects/invalid/notes");
    expect(res.status).toBe(400);
  });
});

describe("POST /api/projects/:id/notes", () => {
  const app = createTestApp();

  it("returns 400 when content is missing", async () => {
    const res = await request(app).post("/api/projects/1/notes").send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid project id", async () => {
    const res = await request(app).post("/api/projects/invalid/notes").send({ content: "test" });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/notes/:id", () => {
  const app = createTestApp();

  it("returns 400 for invalid note id", async () => {
    const res = await request(app).delete("/api/notes/invalid");
    expect(res.status).toBe(400);
  });
});
