import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Redis client BEFORE importing the service. Each test sets
// the return value of `set` to simulate Redis's SET NX behavior.
const redisSetMock = vi.fn();
vi.mock('../lib/redis.js', () => ({
  redis: { set: redisSetMock },
}));

// Make the env vars match how PRICE_PLAN_MAP is built.
process.env.STRIPE_STARTER_PRICE_ID = 'price_starter_test';
process.env.STRIPE_PRO_PRICE_ID = 'price_pro_test';

const { markEventProcessed, planForPriceId } = await import('../services/stripe.js');

beforeEach(() => {
  redisSetMock.mockReset();
});

describe('Stripe webhook event dedup', () => {
  it('returns true the first time an event ID is seen', async () => {
    redisSetMock.mockResolvedValueOnce('OK');
    expect(await markEventProcessed('evt_1')).toBe(true);
    expect(redisSetMock).toHaveBeenCalledWith(
      'stripe:event:evt_1',
      '1',
      'EX',
      expect.any(Number),
      'NX',
    );
  });

  it('returns false on a retry (SET NX returned null)', async () => {
    redisSetMock.mockResolvedValueOnce(null);
    expect(await markEventProcessed('evt_1')).toBe(false);
  });

  it('uses a 7-day TTL so delayed Stripe retries are still caught', async () => {
    redisSetMock.mockResolvedValueOnce('OK');
    await markEventProcessed('evt_2');
    const ttl = redisSetMock.mock.calls[0][3];
    expect(ttl).toBe(60 * 60 * 24 * 7);
  });
});

describe('Stripe price -> plan resolution', () => {
  it('resolves the configured starter price to the starter plan', () => {
    expect(planForPriceId('price_starter_test')).toBe('starter');
  });

  it('resolves the configured pro price to the pro plan', () => {
    expect(planForPriceId('price_pro_test')).toBe('pro');
  });

  it('returns null for an unknown price id (audit-02 P0: never trust metadata)', () => {
    expect(planForPriceId('price_unknown_attacker_supplied')).toBe(null);
  });

  it('returns null for undefined / empty input', () => {
    expect(planForPriceId(undefined)).toBe(null);
    expect(planForPriceId('')).toBe(null);
  });
});
