import { eq } from "drizzle-orm";
import { projectAssigneesTable } from "@workspace/db";
import { getAssignees } from "./project-presenter";
import type { DbClient } from "./db-client";

/**
 * ProjectAssignmentService — manages which users are assigned to a project
 * and their commission terms. Extracted from routes/projects.ts.
 *
 * Takes an explicit `client` (the plain `db`, or a `tx` from
 * `db.transaction(...)`) so the delete+reinsert can be grouped atomically
 * with whatever else the caller is doing (e.g. the project update in
 * PATCH /projects/:id) instead of running as separate, unguarded statements.
 */
export async function syncAssignees(
  client: DbClient,
  projectId: number,
  assigneeIds: number[],
  commissions?: Record<number, { commissionType: string; commissionValue: number | null }>
) {
  await client.delete(projectAssigneesTable).where(eq(projectAssigneesTable.projectId, projectId));
  if (assigneeIds.length > 0) {
    await client.insert(projectAssigneesTable).values(
      assigneeIds.map((userId) => {
        const comm = commissions?.[userId];
        return {
          projectId,
          userId,
          commissionType: comm?.commissionType ?? null,
          commissionValue: comm?.commissionValue != null ? String(comm.commissionValue) : null,
        };
      })
    );
  }
  return getAssignees(client, projectId);
}
