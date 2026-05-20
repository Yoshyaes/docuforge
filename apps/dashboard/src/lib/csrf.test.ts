import { describe, it, expect } from 'vitest';
import { assertSameOrigin } from './csrf';

function makeRequest(headers: Record<string, string>): any {
  // Tests don't need a full NextRequest; assertSameOrigin only reads
  // request.headers.get(name).
  return {
    headers: {
      get(name: string): string | null {
        return headers[name.toLowerCase()] ?? null;
      },
    },
  };
}

describe('assertSameOrigin', () => {
  it('accepts Sec-Fetch-Site: same-origin', () => {
    const r = assertSameOrigin(makeRequest({ 'sec-fetch-site': 'same-origin' }));
    expect(r.ok).toBe(true);
  });

  it('accepts Sec-Fetch-Site: same-site', () => {
    const r = assertSameOrigin(makeRequest({ 'sec-fetch-site': 'same-site' }));
    expect(r.ok).toBe(true);
  });

  it('accepts Sec-Fetch-Site: none (direct navigation)', () => {
    const r = assertSameOrigin(makeRequest({ 'sec-fetch-site': 'none' }));
    expect(r.ok).toBe(true);
  });

  it('rejects Sec-Fetch-Site: cross-site', () => {
    const r = assertSameOrigin(makeRequest({ 'sec-fetch-site': 'cross-site' }));
    expect(r.ok).toBe(false);
  });

  it('rejects when no Sec-Fetch-Site and no Origin header', () => {
    const r = assertSameOrigin(makeRequest({}));
    expect(r.ok).toBe(false);
  });

  it('accepts when Origin matches DASHBOARD_URL', () => {
    const prev = process.env.DASHBOARD_URL;
    process.env.DASHBOARD_URL = 'https://app.example.com';
    try {
      const r = assertSameOrigin(makeRequest({ origin: 'https://app.example.com' }));
      expect(r.ok).toBe(true);
    } finally {
      if (prev === undefined) delete process.env.DASHBOARD_URL;
      else process.env.DASHBOARD_URL = prev;
    }
  });

  it('rejects when Origin does not match DASHBOARD_URL', () => {
    const prev = process.env.DASHBOARD_URL;
    process.env.DASHBOARD_URL = 'https://app.example.com';
    try {
      const r = assertSameOrigin(makeRequest({ origin: 'https://attacker.example' }));
      expect(r.ok).toBe(false);
    } finally {
      if (prev === undefined) delete process.env.DASHBOARD_URL;
      else process.env.DASHBOARD_URL = prev;
    }
  });

  it('rejects when Origin is present but no DASHBOARD_URL configured', () => {
    const prev = process.env.DASHBOARD_URL;
    const prevPub = process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.DASHBOARD_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    try {
      const r = assertSameOrigin(makeRequest({ origin: 'https://app.example.com' }));
      expect(r.ok).toBe(false);
    } finally {
      if (prev !== undefined) process.env.DASHBOARD_URL = prev;
      if (prevPub !== undefined) process.env.NEXT_PUBLIC_APP_URL = prevPub;
    }
  });
});
