import { NextResponse } from 'next/server';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  try {
    const res = await fetch(
      `${API_BASE}/v1/starter-templates/${encodeURIComponent(slug)}`,
      { cache: 'no-store' },
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: { message: 'Failed to load starter template' } },
      { status: 502 },
    );
  }
}
