import type { NextRequest } from 'next/server';

/**
 * Defense against CSRF on mutating dashboard API routes.
 *
 * The dashboard uses Clerk session cookies (SameSite=Lax by default),
 * which already blocks top-level GET / form-POST CSRF. But Lax does
 * not protect against state-changing fetch() calls triggered from a
 * malicious page in some configurations, and it does not protect at
 * all against subdomain-takeover scenarios where attacker.app.example
 * shares a base domain with us.
 *
 * Strategy:
 *  - Modern browsers send Sec-Fetch-Site automatically. We accept
 *    'same-origin' and 'same-site' (covers app.x → app.x, no
 *    cross-site).
 *  - Older browsers (and any non-browser caller) won't set
 *    Sec-Fetch-Site, in which case we fall back to comparing the
 *    Origin header against the configured DASHBOARD_URL. If neither
 *    header is present, refuse the request.
 *
 * Read-only handlers (GET, HEAD) should NOT call this — CSRF doesn't
 * apply when nothing changes.
 */
export function assertSameOrigin(request: NextRequest): { ok: true } | { ok: false; reason: string } {
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite) {
    if (fetchSite === 'same-origin' || fetchSite === 'same-site' || fetchSite === 'none') {
      return { ok: true };
    }
    return { ok: false, reason: `cross-site request blocked (sec-fetch-site=${fetchSite})` };
  }

  const origin = request.headers.get('origin');
  if (origin) {
    const expected = process.env.NEXT_PUBLIC_APP_URL || process.env.DASHBOARD_URL;
    if (!expected) {
      // No way to compare — be conservative.
      return { ok: false, reason: 'origin header present but no DASHBOARD_URL configured to compare against' };
    }
    try {
      const got = new URL(origin).origin;
      const want = new URL(expected).origin;
      if (got === want) return { ok: true };
      return { ok: false, reason: `origin ${got} does not match ${want}` };
    } catch {
      return { ok: false, reason: 'origin header is not a valid URL' };
    }
  }

  // Same-origin fetches without a JS-controlled Origin are usually
  // top-level navigations from the same origin. Modern browsers send
  // Sec-Fetch-Site for those too, so reaching this branch in a
  // browser is rare. Reject to keep the policy simple.
  return { ok: false, reason: 'missing Sec-Fetch-Site and Origin headers' };
}
