-- Email drip campaign tracking
-- Run with: psql $DATABASE_URL -f drizzle/0001_email_events.sql

DO $$ BEGIN
  CREATE TYPE "email_campaign" AS ENUM('welcome', 'nudge1', 'nudge2', 'last_call', 'first_pdf', 'reengagement');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "email_status" AS ENUM('queued', 'sent', 'failed', 'skipped');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "email_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "campaign" "email_campaign" NOT NULL,
  "status" "email_status" DEFAULT 'queued' NOT NULL,
  "provider_message_id" varchar(255),
  "error_message" text,
  "sent_at" timestamp,
  "opened_at" timestamp,
  "clicked_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "email_events_user_campaign_idx"
  ON "email_events" ("user_id", "campaign");

CREATE INDEX IF NOT EXISTS "email_events_status_idx"
  ON "email_events" ("status");
