import { eq, sql } from "drizzle-orm";
import { db, paymentHistoryTable, projectsTable } from "@workspace/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * PaymentLedgerService — the single place that recomputes and writes
 * `projects.amount_paid` from `payment_history`.
 *
 * There is no DB trigger (see README) — every code path that inserts or
 * deletes payment_history rows MUST call this in the same transaction as
 * that write, or the cached total on the project will silently drift from
 * the ledger. Previously this recompute was duplicated inline in both
 * POST /payments and DELETE /payments/:id; centralizing it here means there
 * is exactly one place to call (and one place to fix, if the formula ever
 * changes) instead of two copies that could drift from each other.
 */
export async function recalculateProjectAmountPaid(client: DbClient, projectId: number): Promise<void> {
  const [sumRow] = await client
    .select({ total: sql<string>`COALESCE(SUM(${paymentHistoryTable.amount}), 0)` })
    .from(paymentHistoryTable)
    .where(eq(paymentHistoryTable.projectId, projectId));

  await client
    .update(projectsTable)
    .set({ amountPaid: sumRow.total } as any)
    .where(eq(projectsTable.id, projectId));
}
