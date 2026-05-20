import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Stub DNS so individual tests can choose what resolves to what.
const resolve4Mock = vi.fn();
const resolve6Mock = vi.fn();
vi.mock('dns/promises', () => ({
  resolve4: resolve4Mock,
  resolve6: resolve6Mock,
  resolve: resolve4Mock,
}));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const { deliverWebhook } = await import('../services/webhooks.js');

beforeEach(() => {
  resolve4Mock.mockReset();
  resolve6Mock.mockReset();
  fetchMock.mockReset();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Webhook SSRF protection', () => {
  it('rejects http://localhost without making a network call', async () => {
    await deliverWebhook('http://localhost/hook', { id: 'g1', status: 'completed' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a URL whose A record points at 169.254.169.254 (cloud IMDS)', async () => {
    resolve4Mock.mockResolvedValue(['169.254.169.254']);
    resolve6Mock.mockResolvedValue([]);

    await deliverWebhook('http://attacker.example/hook', { id: 'g1', status: 'completed' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects when the A record is empty but AAAA resolves to a private IP', async () => {
    resolve4Mock.mockResolvedValue([]);
    resolve6Mock.mockResolvedValue(['fc00::1']); // unique-local IPv6

    await deliverWebhook('http://ipv6-only.example/hook', { id: 'g1', status: 'completed' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a URL with a non-allowlisted scheme', async () => {
    await deliverWebhook('ftp://example.com/hook' as any, { id: 'g1', status: 'completed' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a URL with userinfo (user:pass@)', async () => {
    await deliverWebhook('https://user:pass@example.com/hook', { id: 'g1', status: 'completed' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a URL whose port is not on the allowlist', async () => {
    resolve4Mock.mockResolvedValue(['93.184.216.34']);
    resolve6Mock.mockResolvedValue([]);
    await deliverWebhook('http://example.com:9200/hook', { id: 'g1', status: 'completed' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a single-label hostname (e.g. intranet)', async () => {
    await deliverWebhook('http://intranet/hook', { id: 'g1', status: 'completed' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an IP literal that is in the private range', async () => {
    await deliverWebhook('http://10.0.0.1/hook', { id: 'g1', status: 'completed' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('accepts a public hostname and uses redirect: manual', async () => {
    resolve4Mock.mockResolvedValue(['93.184.216.34']);
    resolve6Mock.mockResolvedValue([]);
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers() });

    await deliverWebhook('https://example.com/hook', { id: 'g1', status: 'completed' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const opts = fetchMock.mock.calls[0][1];
    expect(opts.redirect).toBe('manual');
  });

  it(
    're-validates the redirect target and refuses 302-to-private-ip',
    async () => {
      // initial URL is public ...
      resolve4Mock.mockResolvedValue(['93.184.216.34']);
      resolve6Mock.mockResolvedValue([]);
      // ... but the redirect target resolves to IMDS on the next lookup
      // pair. We re-prime to the IMDS address after the first call so
      // the redirect path trips the SSRF guard.
      let dnsCall = 0;
      resolve4Mock.mockImplementation(async () => {
        dnsCall++;
        return dnsCall === 1 ? ['93.184.216.34'] : ['169.254.169.254'];
      });

      fetchMock.mockResolvedValue({
        status: 302,
        headers: new Headers({ location: 'http://attacker.example/redirect-target' }),
      });

      await deliverWebhook('https://example.com/hook', { id: 'g1', status: 'completed' });

      // Every attempt does exactly one fetch (the initial POST) and
      // then refuses the redirect. With 1 initial + 3 retries the
      // outer retry loop fires 4 times — what we care about is that
      // no fetch ever targeted the redirect URL itself.
      const calledUrls = fetchMock.mock.calls.map((c) => c[0]);
      expect(calledUrls.some((u) => String(u).includes('attacker'))).toBe(false);
    },
    20_000,
  );
});
