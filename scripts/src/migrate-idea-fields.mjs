/**
 * One-time migration: copy data from the legacy "dead" idea columns
 * into the active columns used by the current codebase.
 *
 * Dead  → Active mapping
 * ─────────────────────────────────────────────────────────────────
 * projects.client_original_idea → projects.original_client_idea
 * projects.ai_enhanced_idea     → projects.final_proposed_idea
 * projects.team_proposal        → projects.ai_generated_suggestion
 *   (team_proposal is the closest semantic match for the AI-assisted
 *    suggestion from the old naming convention)
 *
 * Run once after deploying the new code:
 *   node scripts/src/migrate-idea-fields.mjs
 *
 * Safe to re-run — only copies when the active column is NULL and the
 * dead column has data.
 */

import pg from "pg";

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  await client.connect();
  console.log("Connected to database.");

  // 1. Copy client_original_idea → original_client_idea (only where active is null)
  const r1 = await client.query(`
    UPDATE projects
       SET original_client_idea = client_original_idea
     WHERE original_client_idea IS NULL
       AND client_original_idea IS NOT NULL
  `);
  console.log(`original_client_idea: updated ${r1.rowCount} rows`);

  // 2. Copy ai_enhanced_idea → final_proposed_idea
  const r2 = await client.query(`
    UPDATE projects
       SET final_proposed_idea = ai_enhanced_idea
     WHERE final_proposed_idea IS NULL
       AND ai_enhanced_idea IS NOT NULL
  `);
  console.log(`final_proposed_idea:  updated ${r2.rowCount} rows`);

  // 3. Copy team_proposal → ai_generated_suggestion
  const r3 = await client.query(`
    UPDATE projects
       SET ai_generated_suggestion = team_proposal
     WHERE ai_generated_suggestion IS NULL
       AND team_proposal IS NOT NULL
  `);
  console.log(`ai_generated_suggestion: updated ${r3.rowCount} rows`);

  console.log("Migration complete.");
  await client.end();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
