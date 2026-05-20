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
 * Secrets that MUST be set when NODE_ENV=production. Each entry is the
 * env var name and a short reason — included in the failure message so
 * the deploy operator can fix it without grepping the codebase.
 */
const PRODUCTION_REQUIRED: Array<{ name: keyof Env; reason: string }> = [
  { name: 'WEBHOOK_SIGNING_SECRET', reason: 'outbound webhook HMAC' },
  { name: 'CLERK_WEBHOOK_SECRET', reason: 'inbound Clerk webhook signature verification' },
  { name: 'STRIPE_SECRET_KEY', reason: 'Stripe API calls (billing)' },
  { name: 'STRIPE_WEBHOOK_SECRET', reason: 'inbound Stripe webhook signature verification' },
  { name: 'DASHBOARD_SERVICE_SECRET', reason: 'dashboard ↔ API service-to-service auth' },
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
    const missing: string[] = [];
    for (const { name, reason } of PRODUCTION_REQUIRED) {
      if (!env[name]) missing.push(`  ${name} — ${reason}`);
    }
    if (env.STORAGE_PROVIDER === 'local') {
      missing.push(
        '  STORAGE_PROVIDER=local is unsafe in production — PDFs would live on the ephemeral container disk. Set to r2, s3, or gcs.',
      );
    }
    if (missing.length > 0) {
      console.error('Production environment is missing required configuration:');
      for (const line of missing) console.error(line);
      process.exit(1);
    }
  }

  return env;
}

export const env = validateEnv();
