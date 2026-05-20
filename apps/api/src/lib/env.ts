import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string(),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  STORAGE_PROVIDER: z.enum(['local', 'r2', 's3', 'gcs']).default('local'),
  ANTHROPIC_API_KEY: z.string().optional(),
  WEBHOOK_SIGNING_SECRET: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).optional(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).optional(),
  // Optional but required-when-feature-is-enabled. We don't fail boot
  // on these being unset — we fail loud at use-time so a misconfigured
  // deploy still starts but every call to the missing-secret feature
  // returns 5xx with a clear log.
  CLERK_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_STARTER_PRICE_ID: z.string().optional(),
  STRIPE_PRO_PRICE_ID: z.string().optional(),
  DASHBOARD_SERVICE_SECRET: z.string().min(16).optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),
  S3_PUBLIC_URL: z.string().url().optional(),
  GCS_PUBLIC_URL: z.string().url().optional(),
  // STORAGE_PROVIDER=local in production is almost always wrong (PDFs
  // live on the container's ephemeral disk). The validator enforces a
  // remote provider when NODE_ENV=production.
});

export type Env = z.infer<typeof envSchema>;

/**
 * Feature-gated secrets. If unset in production we log a warning at
 * boot — the deploy succeeds, and the feature's own code returns 5xx
 * with a clear message at call-time (see services/stripe.ts,
 * services/webhooks.ts, routes/webhooks.ts, middleware/auth.ts).
 *
 * Boot used to hard-fail on these; that was overreach. A user who
 * isn't using Stripe billing or Clerk webhooks shouldn't need to
 * generate placeholders just to deploy.
 */
const FEATURE_GATED_SECRETS: Array<{ name: keyof Env; reason: string }> = [
  { name: 'WEBHOOK_SIGNING_SECRET', reason: 'outbound webhook HMAC — webhooks will be skipped' },
  { name: 'CLERK_WEBHOOK_SECRET', reason: 'inbound Clerk webhook verification — /webhooks/clerk will 500' },
  { name: 'STRIPE_SECRET_KEY', reason: 'Stripe API calls — /v1/billing/* will 503' },
  { name: 'STRIPE_WEBHOOK_SECRET', reason: 'inbound Stripe webhook verification — /v1/billing/webhooks will 500' },
  { name: 'DASHBOARD_SERVICE_SECRET', reason: 'dashboard ↔ API service auth — playground / service routes will 401' },
];

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:');
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }
  const env = result.data;

  if (env.NODE_ENV === 'production') {
    // Hard-fail on STORAGE_PROVIDER=local: there is no runtime guard
    // that can save you. PDFs would land on the container's
    // ephemeral disk and disappear on every redeploy.
    if (env.STORAGE_PROVIDER === 'local') {
      console.error('Production environment refuses to start:');
      console.error(
        '  STORAGE_PROVIDER=local is unsafe in production — PDFs would live on the',
      );
      console.error(
        '  container ephemeral disk and be lost on every redeploy. Set to r2, s3, or gcs.',
      );
      process.exit(1);
    }

    // Soft-warn on feature-gated secrets so an operator deploying
    // without Stripe / Clerk / outbound webhooks isn't blocked.
    const missing = FEATURE_GATED_SECRETS.filter(({ name }) => !env[name]);
    if (missing.length > 0) {
      console.warn('Production environment is starting with feature-gated secrets unset.');
      console.warn('Each affected feature will fail loud at call-time:');
      for (const { name, reason } of missing) {
        console.warn(`  ${name}: ${reason}`);
      }
    }
  }

  return env;
}

export const env = validateEnv();
