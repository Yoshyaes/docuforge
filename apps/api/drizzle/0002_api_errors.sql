-- API error logging (pre-insert / validation / auth failures)
-- Captures every 4xx/5xx response on /v1/* so we can see what kills
-- first-time activations before a generations row is ever written.
-- Run with: psql $DATABASE_URL -f drizzle/0002_api_errors.sql

CREATE TABLE IF NOT EXISTS "api_errors" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
  "api_key_prefix" varchar(16),
  "method" varchar(10) NOT NULL,
  "path" varchar(255) NOT NULL,
  "error_code" varchar(64) NOT NULL,
  "error_message" text NOT NULL,
  "status_code" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "api_errors_user_id_idx" ON "api_errors" ("user_id");
CREATE INDEX IF NOT EXISTS "api_errors_created_at_idx" ON "api_errors" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "api_errors_code_idx" ON "api_errors" ("error_code");
