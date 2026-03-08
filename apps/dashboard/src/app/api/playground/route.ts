import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/data';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { html, format, orientation } = body;

  if (!html) {
    return NextResponse.json({ error: { message: 'HTML is required' } }, { status: 400 });
  }

  const serviceSecret = process.env.DASHBOARD_SERVICE_SECRET;
  if (!serviceSecret) {
    return NextResponse.json(
      { error: { message: 'Playground is not configured. Set DASHBOARD_SERVICE_SECRET.' } },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(`${API_BASE}/v1/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Secret': serviceSecret,
        'X-Service-User-Id': user.id,
      },
      body: JSON.stringify({
        html,
        options: {
          format: format || 'A4',
          orientation: orientation || 'portrait',
        },
        output: 'url',
      }),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: { message: 'Failed to connect to API' } },
      { status: 502 },
    );
  }
}
