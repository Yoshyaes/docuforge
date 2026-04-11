/**
 * One-shot user audit script.
 *
 * Produces a written analysis of every user: who activated, who stalled,
 * what killed their first attempt, and the time gap between signup and
 * first generation. Intended as a founder-facing memo — run once after
 * shipping the analytics workstream, then use the findings to prioritize
 * onboarding changes.
 *
 * Usage: cd apps/api && npx tsx src/scripts/audit-users.ts
 */
import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from '../lib/db.js';

type Row = Record<string, unknown>;

function fmtDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return 'never';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${(seconds / 86400).toFixed(1)}d`;
}

function fmtPct(n: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((n / total) * 1000) / 10}%`;
}

function section(title: string): void {
  console.log('\n' + '='.repeat(72));
  console.log(title);
  console.log('='.repeat(72));
}

async function audit(): Promise<void> {
  section('DOCUFORGE USER AUDIT');
  console.log(`Generated: ${new Date().toISOString()}`);

  // ------------------------------------------------------------------
  // 1. Activation funnel
  // ------------------------------------------------------------------
  section('1. ACTIVATION FUNNEL');

  const funnel = await db.execute(sql`
    SELECT
      (SELECT COUNT(*)::int FROM users)                                                AS signed_up,
      (SELECT COUNT(DISTINCT user_id)::int FROM api_keys)                              AS created_key,
      (SELECT COUNT(DISTINCT user_id)::int FROM generations)                           AS any_gen,
      (SELECT COUNT(DISTINCT user_id)::int FROM generations WHERE status = 'completed') AS any_success,
      (SELECT COUNT(DISTINCT user_id)::int FROM generations
         WHERE created_at >= NOW() - INTERVAL '7 days')                                AS active_7d,
      (SELECT COUNT(DISTINCT user_id)::int FROM generations
         WHERE created_at >= NOW() - INTERVAL '30 days')                               AS active_30d
  `);
  const f = funnel.rows[0] as Row;
  const signedUp = Number(f.signed_up) || 0;

  console.log(`  Signed up                    : ${signedUp}`);
  console.log(`  Created an API key           : ${f.created_key}  (${fmtPct(Number(f.created_key), signedUp)})`);
  console.log(`  Generated any PDF            : ${f.any_gen}  (${fmtPct(Number(f.any_gen), signedUp)})`);
  console.log(`  Generated a SUCCESSFUL PDF   : ${f.any_success}  (${fmtPct(Number(f.any_success), signedUp)})`);
  console.log(`  Active last 7 days           : ${f.active_7d}  (${fmtPct(Number(f.active_7d), signedUp)})`);
  console.log(`  Active last 30 days          : ${f.active_30d}  (${fmtPct(Number(f.active_30d), signedUp)})`);

  // ------------------------------------------------------------------
  // 2. Per-user breakdown
  // ------------------------------------------------------------------
  section('2. PER-USER BREAKDOWN');

  const perUser = await db.execute(sql`
    SELECT
      u.email,
      u.plan,
      u.role,
      u.created_at,
      EXTRACT(EPOCH FROM (NOW() - u.created_at))::int  AS signup_age_sec,
      COALESCE(k.key_count, 0)                         AS key_count,
      k.last_key_used_at,
      COALESCE(g.total_gens, 0)                        AS total_gens,
      COALESCE(g.success_gens, 0)                      AS success_gens,
      COALESCE(g.failed_gens, 0)                       AS failed_gens,
      g.first_gen_at,
      g.last_gen_at,
      CASE
        WHEN g.first_gen_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (g.first_gen_at - u.created_at))::int
        ELSE NULL
      END                                              AS time_to_first_gen_sec,
      g.first_error,
      g.input_types,
      COALESCE(t.tpl_count, 0)                         AS tpl_count
    FROM users u
    LEFT JOIN (
      SELECT
        user_id,
        COUNT(*)::int       AS key_count,
        MAX(last_used_at)   AS last_key_used_at
      FROM api_keys
      GROUP BY user_id
    ) k ON k.user_id = u.id
    LEFT JOIN (
      SELECT
        gn.user_id,
        COUNT(*)::int                                            AS total_gens,
        COUNT(*) FILTER (WHERE gn.status = 'completed')::int     AS success_gens,
        COUNT(*) FILTER (WHERE gn.status = 'failed')::int        AS failed_gens,
        MIN(gn.created_at)                                       AS first_gen_at,
        MAX(gn.created_at)                                       AS last_gen_at,
        (
          SELECT gg.error FROM generations gg
          WHERE gg.user_id = gn.user_id AND gg.status = 'failed'
          ORDER BY gg.created_at ASC LIMIT 1
        )                                                        AS first_error,
        ARRAY_AGG(DISTINCT gn.input_type)                        AS input_types
      FROM generations gn
      GROUP BY gn.user_id
    ) g ON g.user_id = u.id
    LEFT JOIN (
      SELECT user_id, COUNT(*)::int AS tpl_count
      FROM templates
      GROUP BY user_id
    ) t ON t.user_id = u.id
    ORDER BY u.created_at DESC
  `);

  for (const row of perUser.rows as Row[]) {
    const totalGens = Number(row.total_gens) || 0;
    const successGens = Number(row.success_gens) || 0;
    const ttf = row.time_to_first_gen_sec as number | null;
    console.log(`\n  ${row.email}  [${row.plan}${row.role === 'admin' ? '/admin' : ''}]`);
    console.log(`    Signed up           : ${new Date(row.created_at as string).toISOString()}`);
    console.log(`    Keys                : ${row.key_count}   last used: ${row.last_key_used_at ? new Date(row.last_key_used_at as string).toISOString() : 'never'}`);
    console.log(`    Generations         : ${totalGens}   success=${successGens}  failed=${row.failed_gens}`);
    if (totalGens === 0) {
      console.log(`    Status              : STUCK — never generated (key is ${row.last_key_used_at ? 'USED (possibly failed silently)' : 'UNUSED'})`);
    } else {
      console.log(`    Time → first gen    : ${fmtDuration(ttf)}`);
      console.log(`    Last generation     : ${row.last_gen_at ? new Date(row.last_gen_at as string).toISOString() : '—'}`);
      console.log(`    Input types         : ${Array.isArray(row.input_types) ? (row.input_types as string[]).join(', ') : '—'}`);
    }
    if (row.first_error) {
      console.log(`    First error         : ${String(row.first_error).slice(0, 200)}`);
    }
    if (Number(row.tpl_count) > 0) {
      console.log(`    Templates created   : ${row.tpl_count}`);
    }
  }

  // ------------------------------------------------------------------
  // 3. First-error breakdown
  // ------------------------------------------------------------------
  section('3. FIRST-TIME ERROR BREAKDOWN');

  const errorRows = await db.execute(sql`
    WITH first_failures AS (
      SELECT DISTINCT ON (g.user_id)
        g.user_id, g.error, g.created_at
      FROM generations g
      WHERE g.status = 'failed'
      ORDER BY g.user_id, g.created_at ASC
    )
    SELECT
      COALESCE(error, '(no error message)') AS error,
      COUNT(*)::int                          AS users_affected
    FROM first_failures
    GROUP BY error
    ORDER BY users_affected DESC
  `);

  if (errorRows.rows.length === 0) {
    console.log('  No failed first-generations recorded.');
  } else {
    for (const row of errorRows.rows as Row[]) {
      console.log(`  [${row.users_affected}]  ${String(row.error).slice(0, 140)}`);
    }
  }

  // ------------------------------------------------------------------
  // 4. Power users (for comparison)
  // ------------------------------------------------------------------
  section('4. POWER USERS (>= 5 successful generations)');

  const power = await db.execute(sql`
    SELECT
      u.email,
      COUNT(g.id)::int                                            AS total_gens,
      COUNT(*) FILTER (WHERE g.status = 'completed')::int         AS success_gens,
      MIN(g.created_at)                                           AS first_gen_at,
      MAX(g.created_at)                                           AS last_gen_at,
      EXTRACT(EPOCH FROM (MIN(g.created_at) - u.created_at))::int AS time_to_first_gen_sec,
      ARRAY_AGG(DISTINCT g.input_type)                            AS input_types
    FROM users u
    JOIN generations g ON g.user_id = u.id
    GROUP BY u.id, u.email, u.created_at
    HAVING COUNT(*) FILTER (WHERE g.status = 'completed') >= 5
    ORDER BY success_gens DESC
  `);

  if (power.rows.length === 0) {
    console.log('  No power users yet.');
  } else {
    for (const row of power.rows as Row[]) {
      console.log(`  ${row.email}`);
      console.log(`    Total: ${row.total_gens}   Success: ${row.success_gens}`);
      console.log(`    Time → first gen : ${fmtDuration(Number(row.time_to_first_gen_sec))}`);
      console.log(`    First → last     : ${row.first_gen_at} → ${row.last_gen_at}`);
      console.log(`    Input types      : ${Array.isArray(row.input_types) ? (row.input_types as string[]).join(', ') : '—'}`);
    }
  }

  // ------------------------------------------------------------------
  // 5. Orphan keys (users whose key has been created but never used)
  // ------------------------------------------------------------------
  section('5. ORPHAN KEYS (key exists, last_used_at IS NULL, no generations)');

  const orphans = await db.execute(sql`
    SELECT u.email, COUNT(k.id)::int AS orphan_keys
    FROM users u
    JOIN api_keys k ON k.user_id = u.id
    LEFT JOIN generations g ON g.user_id = u.id
    WHERE k.last_used_at IS NULL
      AND g.id IS NULL
    GROUP BY u.id, u.email
    ORDER BY orphan_keys DESC
  `);
  if (orphans.rows.length === 0) {
    console.log('  None.');
  } else {
    for (const row of orphans.rows as Row[]) {
      console.log(`  ${row.email}  —  ${row.orphan_keys} key(s)`);
    }
  }

  console.log('\nDone.\n');
  process.exit(0);
}

audit().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
