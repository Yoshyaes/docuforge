import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

type CohortRow = {
  cohort_week: string;
  signups: number;
  w0: number;
  w1: number;
  w2: number;
  w4: number;
  w8: number;
};

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Weekly signup cohorts for the last 12 weeks.
  // Retention: did the user generate at least one PDF during week N relative to their signup week?
  const result = await db.execute(sql`
    WITH cohort_users AS (
      SELECT
        u.id AS user_id,
        DATE_TRUNC('week', u.created_at)::date AS cohort_week
      FROM users u
      WHERE u.created_at >= NOW() - INTERVAL '12 weeks'
    ),
    gen_weeks AS (
      SELECT DISTINCT
        g.user_id,
        DATE_TRUNC('week', g.created_at)::date AS gen_week
      FROM generations g
    )
    SELECT
      c.cohort_week,
      COUNT(DISTINCT c.user_id)::int AS signups,
      COUNT(DISTINCT CASE WHEN g.gen_week = c.cohort_week                              THEN c.user_id END)::int AS w0,
      COUNT(DISTINCT CASE WHEN g.gen_week = c.cohort_week + INTERVAL '1 week'          THEN c.user_id END)::int AS w1,
      COUNT(DISTINCT CASE WHEN g.gen_week = c.cohort_week + INTERVAL '2 weeks'         THEN c.user_id END)::int AS w2,
      COUNT(DISTINCT CASE WHEN g.gen_week = c.cohort_week + INTERVAL '4 weeks'         THEN c.user_id END)::int AS w4,
      COUNT(DISTINCT CASE WHEN g.gen_week = c.cohort_week + INTERVAL '8 weeks'         THEN c.user_id END)::int AS w8
    FROM cohort_users c
    LEFT JOIN gen_weeks g ON g.user_id = c.user_id
    GROUP BY c.cohort_week
    ORDER BY c.cohort_week DESC
  `);

  const cohorts = (result.rows ?? []).map((row) => {
    const r = row as unknown as CohortRow;
    const signups = Number(r.signups) || 0;
    const asPct = (n: number) =>
      signups > 0 ? Math.round((Number(n) / signups) * 1000) / 10 : 0;
    return {
      cohortWeek: r.cohort_week,
      signups,
      retention: {
        w0: { count: Number(r.w0) || 0, pct: asPct(r.w0) },
        w1: { count: Number(r.w1) || 0, pct: asPct(r.w1) },
        w2: { count: Number(r.w2) || 0, pct: asPct(r.w2) },
        w4: { count: Number(r.w4) || 0, pct: asPct(r.w4) },
        w8: { count: Number(r.w8) || 0, pct: asPct(r.w8) },
      },
    };
  });

  return NextResponse.json({ cohorts });
}
