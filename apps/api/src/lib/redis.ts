import Redis from 'ioredis';
import { logger } from './logger.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Reconnect cap. When Redis is unreachable for a long stretch (Upstash
// quota exhausted, network partition, provider outage) ioredis would
// otherwise retry forever, and on quota-style errors EACH retry burns
// another credit — making the problem worse the longer we wait. After
// MAX_RECONNECT_ATTEMPTS we let ioredis give up; the next inbound
// request that needs Redis surfaces a 5xx through the existing
// `redis.on('error')` path. The user's redeploy is the recovery trigger.
const MAX_RECONNECT_ATTEMPTS = 30;

export const redis = new Redis(REDIS_URL, {
  // Per-command retries. Set low so a single transient blip doesn't
  // multiply Redis traffic 3× on every operation.
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    if (times > MAX_RECONNECT_ATTEMPTS) {
      logger.error(
        { attempts: times },
        'Redis: giving up after exhausting reconnect attempts. Restart the service to retry.',
      );
      return null;
    }
    // Exponential backoff, capped at 30s. The cap matters because
    // hosted-Redis quota limits (Upstash, Redis Cloud, etc.) charge
    // per AUTH command — slowing down protects the budget.
    return Math.min(1000 * Math.pow(2, Math.min(times, 6)), 30_000);
  },
});

redis.on('error', (err) => {
  logger.error({ err: err.message }, 'Redis connection error');
});

export async function connectRedis(): Promise<void> {
  try {
    await redis.ping();
    logger.info('Redis connected');
  } catch (err) {
    logger.error({ err }, 'Redis connection failed');
  }
}
