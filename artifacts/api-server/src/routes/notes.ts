import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, notesTable, usersTable } from "@workspace/db";
import {
  ListProjectNotesParams,
  CreateProjectNoteParams,
  CreateProjectNoteBody,
  DeleteNoteParams,
} from "@workspace/api-zod";
import { getSessionUser, requireProjectAccess } from "../middlewares/auth";

const router: IRouter = Router();

async function formatNote(note: typeof notesTable.$inferSelect) {
  let authorName = "مستخدم محذوف";
  let authorRole = "unknown";

  if (note.authorId != null) {
    const [author] = await db
      .select({ name: usersTable.name, role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, note.authorId));
    authorName = author?.name ?? "مستخدم محذوف";
    authorRole = author?.role ?? "unknown";
  }

  return {
    id: note.id,
    projectId: note.projectId,
    authorId: note.authorId ?? null,
    authorName,
    authorRole,
    content: note.content,
    createdAt: note.createdAt.toISOString(),
  };
}

router.get("/projects/:id/notes", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ListProjectNotesParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // User must have access to this project
  const project = await requireProjectAccess(req, res, params.data.id);
  if (!project) return;

  const notes = await db
    .select()
    .from(notesTable)
    .where(eq(notesTable.projectId, params.data.id))
    .orderBy(notesTable.createdAt);
  const formatted = await Promise.all(notes.map(formatNote));
  res.json(formatted);
});

router.post("/projects/:id/notes", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = CreateProjectNoteParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // User must have access to this project
  const project = await requireProjectAccess(req, res, params.data.id);
  if (!project) return;

  const user = await getSessionUser(req, res);
  if (!user) return;

  const parsed = CreateProjectNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [note] = await db
    .insert(notesTable)
    .values({
      projectId: params.data.id,
      authorId: user.id,
      content: parsed.data.content,
    })
    .returning();
  const formatted = await formatNote(note);
  res.status(201).json(formatted);
});

router.delete("/notes/:id", async (req, res): Promise<void> => {
  const user = await getSessionUser(req, res);
  if (!user) return;

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteNoteParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [note] = await db
    .select()
    .from(notesTable)
    .where(eq(notesTable.id, params.data.id));

  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  // Only admin or the note's author can delete it.
  // If authorId is null (author was deleted), only admin may delete the note.
  if (user.role !== "admin" && (note.authorId == null || note.authorId !== user.id)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  await db.delete(notesTable).where(eq(notesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
