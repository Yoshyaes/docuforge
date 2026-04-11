import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

type Row = {
  error: string | null;
  users_affected: number;
  last_occurrence: string;
  sample_user_email: string;
};

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // For each user who has any failed generation, find the FIRST failed one.
  // Then group those first-failures by error message to see which errors
  // are killing new-user activation most often.
  const result = await db.execute(sql`
    WITH first_failures AS (
      SELECT DISTINCT ON (g.user_id)
        g.user_id,
        g.error,
        g.created_at,
        u.email
      FROM generations g
      INNER JOIN users u ON u.id = g.user_id
      WHERE g.status = 'failed'
      ORDER BY g.user_id, g.created_at ASC
    )
    SELECT
      COALESCE(error, '(no error message)') AS error,
      COUNT(*)::int                          AS users_affected,
      MAX(created_at)                        AS last_occurrence,
      (ARRAY_AGG(email ORDER BY created_at DESC))[1] AS sample_user_email
    FROM first_failures
    GROUP BY error
    ORDER BY users_affected DESC
    LIMIT 25
  `);

  const rows = (result.rows ?? []) as unknown as Row[];

  const totalAffected = rows.reduce((sum, r) => sum + Number(r.users_affected || 0), 0);

  const breakdown = rows.map((r) => {
    const count = Number(r.users_affected) || 0;
    return {
      error: r.error || '(no error message)',
      usersAffected: count,
      pct: totalAffected > 0 ? Math.round((count / totalAffected) * 1000) / 10 : 0,
      lastOccurrence: r.last_occurrence,
      sampleUserEmail: r.sample_user_email,
    };
  });

  return NextResponse.json({
    totalUsersWithFirstFailure: totalAffected,
    breakdown,
  });
}
