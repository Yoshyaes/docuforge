import { NextRequest, NextResponse } from 'next/server';
import { db, templates, users } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getCurrentUser } from '@/lib/data';
import { assertSameOrigin } from '@/lib/csrf';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const csrf = assertSameOrigin(request);
  if (!csrf.ok) {
    return NextResponse.json({ error: { message: 'Forbidden', reason: csrf.reason } }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }
  const userId = user.id;

  const [source] = await db
    .select()
    .from(templates)
    .where(and(eq(templates.id, params.id), eq(templates.isPublic, true)))
    .limit(1);

  if (!source) {
    return NextResponse.json({ error: { message: 'Template not found' } }, { status: 404 });
  }

  const newId = `tmpl_${nanoid(16)}`;
  const [cloned] = await db
    .insert(templates)
    .values({
      id: newId,
      userId,
      name: `${source.name} (copy)`,
      htmlContent: source.htmlContent,
      schema: source.schema,
      isPublic: false,
    })
    .returning();

  return NextResponse.json({
    id: cloned.id,
    name: cloned.name,
  }, { status: 201 });
}
