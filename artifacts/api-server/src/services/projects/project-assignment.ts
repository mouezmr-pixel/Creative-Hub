import { eq } from "drizzle-orm";
import { db, projectAssigneesTable } from "@workspace/db";
import { getAssignees } from "./project-presenter";

/**
 * ProjectAssignmentService — manages which users are assigned to a project
 * and their commission terms. Extracted from routes/projects.ts.
 *
 * NOTE: this still does delete-then-reinsert (no transaction). That is a
 * separate, pre-existing concurrency risk noted in the architecture review —
 * out of scope for this extraction, which only moves the code, not its
 * behavior. A follow-up should wrap this in db.transaction(...).
 */
export async function syncAssignees(
  projectId: number,
  assigneeIds: number[],
  commissions?: Record<number, { commissionType: string; commissionValue: number | null }>
) {
  await db.delete(projectAssigneesTable).where(eq(projectAssigneesTable.projectId, projectId));
  if (assigneeIds.length > 0) {
    await db.insert(projectAssigneesTable).values(
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
  return getAssignees(projectId);
}
