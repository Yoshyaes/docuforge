import { NextRequest, NextResponse } from 'next/server';
import { db, apiKeys, users } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { getCurrentUser } from '@/lib/data';
import { assertSameOrigin } from '@/lib/csrf';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const csrf = assertSameOrigin(request);
  if (!csrf.ok) {
    return NextResponse.json({ error: { message: 'Forbidden', reason: csrf.reason } }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }
  const userId = user.id;

  const body = await request.json().catch(() => ({}));
  const name = body.name || 'Default';

  const rawKey = `dk_live_${nanoid(32)}`;
  // bcrypt cost 12 matches the API key path in apps/api/src/services/apikeys.ts
  const keyHash = await bcrypt.hash(rawKey, 12);
  const keyPrefix = rawKey.slice(0, 16);

  const [record] = await db
    .insert(apiKeys)
    .values({ userId, keyHash, keyPrefix, name })
    .returning();

  return NextResponse.json({
    key: rawKey,
    id: record.id,
    name: record.name,
    prefix: `${keyPrefix}...${rawKey.slice(-4)}`,
    created_at: record.createdAt,
  }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const csrf = assertSameOrigin(request);
  if (!csrf.ok) {
    return NextResponse.json({ error: { message: 'Forbidden', reason: csrf.reason } }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }
  const userId = user.id;

  const { searchParams } = new URL(request.url);
  const keyId = searchParams.get('id');
  if (!keyId) {
    return NextResponse.json({ error: { message: 'Missing key id' } }, { status: 400 });
  }

  const result = await db
    .delete(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)))
    .returning();

  if (result.length === 0) {
    return NextResponse.json({ error: { message: 'Key not found' } }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
