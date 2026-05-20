-- Schema sync migration.
-- Brings the migration history in line with src/schema/db.ts. Adds the
-- role enum + users.role column, extends input_type with 'react', and
-- creates the template_versions, stripe_*, and custom_fonts tables plus
-- missing indexes that the running deployment has but no migration ever
-- created.
--
-- Safe to run against an existing prod database: every statement uses
-- IF NOT EXISTS / ADD VALUE IF NOT EXISTS.
--
-- Run with: psql $DATABASE_URL -f drizzle/0003_schema_sync.sql

-- ── 1. role enum + users.role ────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "role" AS ENUM('user', 'admin');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "role" "role" NOT NULL DEFAULT 'user';

-- ── 2. Extend input_type enum with 'react' ───────────────────────────
ALTER TYPE "input_type" ADD VALUE IF NOT EXISTS 'react';

-- ── 3. template_versions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "template_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "template_id" varchar(64) NOT NULL REFERENCES "templates"("id") ON DELETE CASCADE,
  "version" integer NOT NULL,
  "html_content" text NOT NULL,
  "schema" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "template_versions_template_id_idx"
  ON "template_versions" ("template_id");

-- ── 4. Stripe billing ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "stripe_customers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "stripe_customer_id" varchar(255) NOT NULL UNIQUE,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "stripe_customers_user_id_idx"
  ON "stripe_customers" ("user_id");
CREATE INDEX IF NOT EXISTS "stripe_customers_stripe_id_idx"
  ON "stripe_customers" ("stripe_customer_id");

CREATE TABLE IF NOT EXISTS "stripe_subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "stripe_subscription_id" varchar(255) NOT NULL UNIQUE,
  "stripe_price_id" varchar(255) NOT NULL,
  "status" varchar(50) NOT NULL,
  "current_period_start" timestamp,
  "current_period_end" timestamp,
  "cancel_at_period_end" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "stripe_subs_user_id_idx"
  ON "stripe_subscriptions" ("user_id");
CREATE INDEX IF NOT EXISTS "stripe_subs_stripe_id_idx"
  ON "stripe_subscriptions" ("stripe_subscription_id");
CREATE INDEX IF NOT EXISTS "stripe_subs_status_idx"
  ON "stripe_subscriptions" ("status");

-- ── 5. custom_fonts ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "custom_fonts" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" varchar(255) NOT NULL,
  "family" varchar(255) NOT NULL,
  "format" varchar(20) NOT NULL,
  "storage_key" varchar(512) NOT NULL,
  "file_size_bytes" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "custom_fonts_user_id_idx"
  ON "custom_fonts" ("user_id");

-- ── 6. Missing indexes on existing tables ────────────────────────────
CREATE INDEX IF NOT EXISTS "templates_is_public_idx"
  ON "templates" ("is_public");

CREATE INDEX IF NOT EXISTS "generations_status_idx"
  ON "generations" ("status");
