-- Migration: Add startDate, endDate, and repeatWeekly to Holiday
-- Context: Schema now defines Holiday with a date range (startDate/endDate) and repeatWeekly flag,
-- but the database only has a single `date` column. This migration aligns the DB to the schema,
-- backfills data from the old `date` column, and removes it.

-- 1) Add new columns as nullable so we can backfill safely
ALTER TABLE "Holiday" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);
ALTER TABLE "Holiday" ADD COLUMN IF NOT EXISTS "endDate"   TIMESTAMP(3);
ALTER TABLE "Holiday" ADD COLUMN IF NOT EXISTS "repeatWeekly" BOOLEAN NOT NULL DEFAULT false;

-- 2) Backfill from legacy single-date column (if present)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Holiday' AND column_name = 'date'
  ) THEN
    UPDATE "Holiday" SET "startDate" = "date" WHERE "startDate" IS NULL;
    UPDATE "Holiday" SET "endDate"   = "date" WHERE "endDate"   IS NULL;
  END IF;
END $$;

-- 3) Enforce NOT NULL on the new date range columns (schema requires NOT NULL)
ALTER TABLE "Holiday" ALTER COLUMN "startDate" SET NOT NULL;
ALTER TABLE "Holiday" ALTER COLUMN "endDate"   SET NOT NULL;

-- 4) Drop legacy column to avoid ambiguity (safe because schema no longer references it)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Holiday' AND column_name = 'date'
  ) THEN
    ALTER TABLE "Holiday" DROP COLUMN "date";
  END IF;
END $$;