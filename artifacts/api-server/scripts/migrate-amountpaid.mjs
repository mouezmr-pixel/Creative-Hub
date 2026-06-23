/**
 * One-time migration: for every project that has amountPaid > 0
 * but no rows in payment_history, create a single payment_history
 * entry seeded from the legacy amountPaid value.
 *
 * Usage:
 *   pnpm --filter @workspace/api-server migrate:amountpaid
 */

import { pool } from "@workspace/db";

async function run() {
  const client = await pool.connect();
  try {
    const { rows: projects } = await client.query(`
      SELECT id, amount_paid, delivery_date, created_at
      FROM projects
      WHERE amount_paid > 0
    `);

    let created = 0;
    let skipped = 0;

    for (const project of projects) {
      const projectId = project.id;
      const amountPaid = parseFloat(project.amount_paid);

      const { rows: existing } = await client.query(
        `SELECT COUNT(*) AS cnt FROM payment_history WHERE project_id = $1`,
        [projectId]
      );
      const count = parseInt(existing[0].cnt, 10);

      if (count > 0) {
        console.log(`  ↷ project #${projectId}: already has ${count} payment(s) — skipped`);
        skipped++;
        continue;
      }

      const paymentDate = project.delivery_date
        ? new Date(project.delivery_date)
        : new Date(project.created_at);

      await client.query(
        `INSERT INTO payment_history (project_id, amount, currency, payment_date, notes, recorded_by)
         VALUES ($1, $2, 'DZD', $3, 'مرحّل من النظام القديم', NULL)`,
        [projectId, String(amountPaid), paymentDate.toISOString()]
      );

      console.log(`  ✓ project #${projectId}: seeded ${amountPaid} DZD (${paymentDate.toISOString().split("T")[0]})`);
      created++;
    }

    console.log(`\nDone. Created: ${created} | Skipped (already had payments): ${skipped}`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
