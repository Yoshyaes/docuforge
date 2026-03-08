import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { db, users, generations, apiKeys, usageDaily } from '@/lib/db';
import { sql, eq, ilike, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const plan = searchParams.get('plan') || '';
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');

  // Build conditions
  const conditions: any[] = [];
  if (search) {
    conditions.push(ilike(users.email, `%${search}%`));
  }
  if (plan && plan !== 'all') {
    conditions.push(eq(users.plan, plan as any));
  }

  const whereClause = conditions.length > 0
    ? sql`${sql.join(conditions, sql` AND `)}`
    : sql`TRUE`;

  const results = await db.execute(sql`
    SELECT
      u.id,
      u.email,
      u.plan,
      u.role,
      u.created_at,
      COALESCE(g.gen_count, 0) AS generation_count,
      COALESCE(k.key_count, 0) AS key_count,
      g.last_generation
    FROM users u
    LEFT JOIN (
      SELECT user_id,
        COUNT(*) AS gen_count,
        MAX(created_at) AS last_generation
      FROM generations
      GROUP BY user_id
    ) g ON g.user_id = u.id
    LEFT JOIN (
      SELECT user_id, COUNT(*) AS key_count
      FROM api_keys
      GROUP BY user_id
    ) k ON k.user_id = u.id
    WHERE ${whereClause}
    ORDER BY u.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  const countResult = await db.execute(sql`
    SELECT COUNT(*) AS total FROM users WHERE ${whereClause}
  `);

  return NextResponse.json({
    data: results.rows,
    total: (countResult.rows[0] as any)?.total || 0,
  });
}
