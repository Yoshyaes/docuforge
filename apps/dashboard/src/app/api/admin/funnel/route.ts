import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { db, users, apiKeys, generations } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

type PlanBreakdown = {
  plan: string;
  signedUp: number;
  createdApiKey: number;
  generatedFirstPdf: number;
  activeLast7d: number;
  activeLast30d: number;
};

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(request.url);
  const planFilter = url.searchParams.get('plan');

  const now = new Date();
  const sevenDaysAgoTs = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgoTs = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    [signedUp],
    [createdApiKey],
    [generatedFirstPdf],
    [activeLast7d],
    [activeLast30d],
    planBreakdownRows,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(users)
      .where(planFilter ? sql`${users.plan} = ${planFilter}` : sql`TRUE`),

    db
      .select({ count: sql<number>`COUNT(DISTINCT ${apiKeys.userId})::int` })
      .from(apiKeys)
      .innerJoin(users, sql`${users.id} = ${apiKeys.userId}`)
      .where(planFilter ? sql`${users.plan} = ${planFilter}` : sql`TRUE`),

    db
      .select({ count: sql<number>`COUNT(DISTINCT ${generations.userId})::int` })
      .from(generations)
      .innerJoin(users, sql`${users.id} = ${generations.userId}`)
      .where(planFilter ? sql`${users.plan} = ${planFilter}` : sql`TRUE`),

    db
      .select({ count: sql<number>`COUNT(DISTINCT ${generations.userId})::int` })
      .from(generations)
      .innerJoin(users, sql`${users.id} = ${generations.userId}`)
      .where(
        planFilter
          ? sql`${generations.createdAt} >= ${sevenDaysAgoTs} AND ${users.plan} = ${planFilter}`
          : sql`${generations.createdAt} >= ${sevenDaysAgoTs}`,
      ),

    db
      .select({ count: sql<number>`COUNT(DISTINCT ${generations.userId})::int` })
      .from(generations)
      .innerJoin(users, sql`${users.id} = ${generations.userId}`)
      .where(
        planFilter
          ? sql`${generations.createdAt} >= ${thirtyDaysAgoTs} AND ${users.plan} = ${planFilter}`
          : sql`${generations.createdAt} >= ${thirtyDaysAgoTs}`,
      ),

    db.execute(sql`
      SELECT
        u.plan,
        COUNT(DISTINCT u.id)::int AS signed_up,
        COUNT(DISTINCT k.user_id)::int AS created_api_key,
        COUNT(DISTINCT g.user_id)::int AS generated_first_pdf,
        COUNT(DISTINCT g.user_id) FILTER (WHERE g.created_at >= ${sevenDaysAgoTs})::int AS active_last_7d,
        COUNT(DISTINCT g.user_id) FILTER (WHERE g.created_at >= ${thirtyDaysAgoTs})::int AS active_last_30d
      FROM users u
      LEFT JOIN api_keys k ON k.user_id = u.id
      LEFT JOIN generations g ON g.user_id = u.id
      GROUP BY u.plan
      ORDER BY u.plan
    `),
  ]);

  const total = Number(signedUp.count) || 0;
  const keyCount = Number(createdApiKey.count) || 0;
  const firstPdfCount = Number(generatedFirstPdf.count) || 0;
  const active7 = Number(activeLast7d.count) || 0;
  const active30 = Number(activeLast30d.count) || 0;

  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 1000) / 10 : 0);

  const planBreakdown: PlanBreakdown[] = (planBreakdownRows.rows ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      plan: String(r.plan),
      signedUp: Number(r.signed_up) || 0,
      createdApiKey: Number(r.created_api_key) || 0,
      generatedFirstPdf: Number(r.generated_first_pdf) || 0,
      activeLast7d: Number(r.active_last_7d) || 0,
      activeLast30d: Number(r.active_last_30d) || 0,
    };
  });

  return NextResponse.json({
    steps: [
      { key: 'signed_up', label: 'Signed up', count: total, pct: 100 },
      { key: 'created_api_key', label: 'Created API key', count: keyCount, pct: pct(keyCount) },
      { key: 'generated_first_pdf', label: 'Generated first PDF', count: firstPdfCount, pct: pct(firstPdfCount) },
      { key: 'active_last_7d', label: 'Active last 7 days', count: active7, pct: pct(active7) },
      { key: 'active_last_30d', label: 'Active last 30 days', count: active30, pct: pct(active30) },
    ],
    dropOffs: {
      signupToKey: total - keyCount,
      keyToFirstPdf: keyCount - firstPdfCount,
      firstPdfToActive: firstPdfCount - active30,
    },
    planBreakdown,
  });
}
