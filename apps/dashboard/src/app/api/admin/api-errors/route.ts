import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

type GroupedRow = {
  error_code: string;
  path: string;
  users_affected: number;
  occurrences: number;
  last_occurrence: string;
  sample_message: string;
};

type RecentRow = {
  id: string;
  user_id: string | null;
  email: string | null;
  api_key_prefix: string | null;
  method: string;
  path: string;
  error_code: string;
  error_message: string;
  status_code: number;
  created_at: string;
};

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const hours = Math.min(parseInt(searchParams.get('hours') || '168'), 24 * 30);
  const userId = searchParams.get('userId');

  const userFilter = userId
    ? sql`AND e.user_id = ${userId}::uuid`
    : sql``;

  const [grouped, recent, totals] = await Promise.all([
    // Grouped breakdown — (error_code, path) → counts, distinct users, last seen
    db.execute(sql`
      SELECT
        e.error_code,
        e.path,
        COUNT(DISTINCT e.user_id)::int        AS users_affected,
        COUNT(*)::int                          AS occurrences,
        MAX(e.created_at)                      AS last_occurrence,
        (ARRAY_AGG(e.error_message ORDER BY e.created_at DESC))[1] AS sample_message
      FROM api_errors e
      WHERE e.created_at >= NOW() - (${hours}::int || ' hours')::interval
        ${userFilter}
      GROUP BY e.error_code, e.path
      ORDER BY users_affected DESC, occurrences DESC
      LIMIT 50
    `),

    // Recent individual errors — last 50
    db.execute(sql`
      SELECT
        e.id,
        e.user_id,
        u.email,
        e.api_key_prefix,
        e.method,
        e.path,
        e.error_code,
        e.error_message,
        e.status_code,
        e.created_at
      FROM api_errors e
      LEFT JOIN users u ON u.id = e.user_id
      WHERE e.created_at >= NOW() - (${hours}::int || ' hours')::interval
        ${userFilter}
      ORDER BY e.created_at DESC
      LIMIT 50
    `),

    // Totals for the header stat
    db.execute(sql`
      SELECT
        COUNT(*)::int                                                                AS total_errors,
        COUNT(DISTINCT user_id)::int                                                  AS users_affected,
        COUNT(*) FILTER (WHERE status_code >= 500)::int                               AS server_errors,
        COUNT(*) FILTER (WHERE status_code = 401)::int                                AS auth_errors,
        COUNT(*) FILTER (WHERE status_code = 400)::int                                AS validation_errors,
        COUNT(*) FILTER (WHERE status_code = 429)::int                                AS rate_limits,
        COUNT(*) FILTER (WHERE status_code = 403)::int                                AS usage_limits
      FROM api_errors
      WHERE created_at >= NOW() - (${hours}::int || ' hours')::interval
        ${userFilter}
    `),
  ]);

  const groupedRows = ((grouped.rows ?? []) as unknown as GroupedRow[]).map((r) => ({
    errorCode: r.error_code,
    path: r.path,
    usersAffected: Number(r.users_affected) || 0,
    occurrences: Number(r.occurrences) || 0,
    lastOccurrence: r.last_occurrence,
    sampleMessage: r.sample_message,
  }));

  const recentRows = ((recent.rows ?? []) as unknown as RecentRow[]).map((r) => ({
    id: r.id,
    userId: r.user_id,
    email: r.email,
    apiKeyPrefix: r.api_key_prefix,
    method: r.method,
    path: r.path,
    errorCode: r.error_code,
    errorMessage: r.error_message,
    statusCode: Number(r.status_code),
    createdAt: r.created_at,
  }));

  const totalRow = (totals.rows?.[0] ?? {}) as Record<string, unknown>;

  return NextResponse.json({
    windowHours: hours,
    totals: {
      totalErrors: Number(totalRow.total_errors) || 0,
      usersAffected: Number(totalRow.users_affected) || 0,
      serverErrors: Number(totalRow.server_errors) || 0,
      authErrors: Number(totalRow.auth_errors) || 0,
      validationErrors: Number(totalRow.validation_errors) || 0,
      rateLimits: Number(totalRow.rate_limits) || 0,
      usageLimits: Number(totalRow.usage_limits) || 0,
    },
    grouped: groupedRows,
    recent: recentRows,
  });
}
