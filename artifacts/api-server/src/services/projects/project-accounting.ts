import { eq } from "drizzle-orm";
import { format } from "date-fns";
import { projectAssigneesTable, usersTable, expensesTable } from "@workspace/db";
import type { DbClient } from "./db-client";

/**
 * ProjectAccountingService — the project/accounting side-effect that used to
 * live inline inside PATCH /projects/:id. Extracted from routes/projects.ts.
 *
 * When a project is marked completed with a final cost, this creates one
 * "creative_payout" expense per assignee with a commission, skipping any
 * that already have a matching expense (idempotent via the `reference`
 * column: `commission_auto_<projectId>_<userId>`).
 *
 * Takes an explicit `client` (db or tx) so this runs atomically alongside
 * the project update that triggered it — if either fails, neither is kept.
 */
export async function createCommissionExpensesForCompletedProject(
  client: DbClient,
  project: {
    id: number;
    title: string;
    finalCost: string | null;
  }
) {
  if (!project.finalCost) return;
  const finalCost = parseFloat(project.finalCost as unknown as string);
  if (finalCost <= 0) return;

  const assigneeRows = await client
    .select({
      userId: projectAssigneesTable.userId,
      name: usersTable.name,
      commissionType: projectAssigneesTable.commissionType,
      commissionValue: projectAssigneesTable.commissionValue,
    })
    .from(projectAssigneesTable)
    .innerJoin(usersTable, eq(projectAssigneesTable.userId, usersTable.id))
    .where(eq(projectAssigneesTable.projectId, project.id));

  for (const a of assigneeRows) {
    if (!a.commissionValue) continue;
    const val = parseFloat(a.commissionValue as string);
    if (val <= 0) continue;
    const amount = a.commissionType === "percentage" ? (finalCost * val) / 100 : val;

    const reference = `commission_auto_${project.id}_${a.userId}`;
    const [dup] = await client.select({ id: expensesTable.id }).from(expensesTable).where(eq(expensesTable.reference, reference));
    if (dup) continue;

    await client.insert(expensesTable).values({
      category: "creative_payout",
      amount: String(Math.round(amount * 100) / 100),
      date: format(new Date(), "yyyy-MM-dd"),
      description: `${a.name} — ${project.title} — Commission`,
      reference,
    });
  }
}
