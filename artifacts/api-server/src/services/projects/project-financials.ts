import { eq } from "drizzle-orm";
import { db, projectsTable, clientsTable } from "@workspace/db";

/**
 * ProjectFinancialsService — pure/lightweight financial rules for a project.
 * Extracted from routes/projects.ts so business rules don't live in the HTTP layer.
 */

export function computeDebt(project: typeof projectsTable.$inferSelect): number {
  const finalCost = project.finalCost ? parseFloat(project.finalCost as unknown as string) : 0;
  const discount = project.discount ? parseFloat(project.discount as unknown as string) : 0;
  const amountPaid = project.amountPaid ? parseFloat(project.amountPaid as unknown as string) : 0;
  return Math.max(0, finalCost - discount - amountPaid);
}

/** Strip financial fields from a formatted project for roles that should not see them. */
export function maskFinancials(p: Record<string, unknown>): Record<string, unknown> {
  return { ...p, finalCost: null, amountPaid: null, discount: null, remainingDebt: null };
}

export async function getClientCanViewFinancials(userId: number): Promise<boolean> {
  const [row] = await db
    .select({ canViewFinancials: clientsTable.canViewFinancials })
    .from(clientsTable)
    .where(eq(clientsTable.userId, userId));
  return row?.canViewFinancials ?? false;
}
