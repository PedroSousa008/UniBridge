import { prisma } from '@/lib/db';

let ensurePromise: Promise<boolean> | null = null;

const CALENDAR_SCHEMA_SQL = `
DO $$ BEGIN CREATE TYPE "CalendarLayer" AS ENUM ('ACADEMIC', 'CAREER', 'STARTUP', 'PERSONAL', 'SOCIAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CalendarQuickType" AS ENUM ('TASK', 'EVENT', 'STUDY_SESSION', 'REMINDER', 'MEETING', 'EXAM'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CalendarRecurrence" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "StudentCalendarEvent" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category" "CalendarLayer" NOT NULL DEFAULT 'PERSONAL',
  "quickType" "CalendarQuickType" NOT NULL DEFAULT 'EVENT',
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "allDay" BOOLEAN NOT NULL DEFAULT false,
  "color" TEXT NOT NULL DEFAULT '#6366f1',
  "location" TEXT,
  "room" TEXT,
  "professor" TEXT,
  "recurrence" "CalendarRecurrence" NOT NULL DEFAULT 'NONE',
  "recurrenceMeta" JSONB,
  "taggedEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "startupId" TEXT,
  "sourceRef" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentCalendarEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StudentCalendarEvent_studentId_startAt_idx" ON "StudentCalendarEvent"("studentId", "startAt");
CREATE INDEX IF NOT EXISTS "StudentCalendarEvent_taggedEmails_idx" ON "StudentCalendarEvent" USING GIN ("taggedEmails");

DO $$ BEGIN ALTER TABLE "StudentCalendarEvent" ADD CONSTRAINT "StudentCalendarEvent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "StudentCalendarPreference" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "countdownMinutes" INTEGER[] DEFAULT ARRAY[10080, 4320, 1440, 720, 120],
  "layersEnabled" JSONB,
  "googleSyncEnabled" BOOLEAN NOT NULL DEFAULT false,
  "appleSyncEnabled" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentCalendarPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StudentCalendarPreference_studentId_key" ON "StudentCalendarPreference"("studentId");
DO $$ BEGIN ALTER TABLE "StudentCalendarPreference" ADD CONSTRAINT "StudentCalendarPreference_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "StudentCalendarHidden" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentCalendarHidden_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StudentCalendarHidden_studentId_sourceType_sourceId_key" ON "StudentCalendarHidden"("studentId", "sourceType", "sourceId");
CREATE INDEX IF NOT EXISTS "StudentCalendarHidden_studentId_idx" ON "StudentCalendarHidden"("studentId");
DO $$ BEGIN ALTER TABLE "StudentCalendarHidden" ADD CONSTRAINT "StudentCalendarHidden_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
`;

async function tableReady(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1 FROM "StudentCalendarEvent" LIMIT 1`;
    return true;
  } catch {
    return false;
  }
}

async function runEnsure(): Promise<boolean> {
  if (await tableReady()) return true;
  try {
    await prisma.$executeRawUnsafe(CALENDAR_SCHEMA_SQL);
    return await tableReady();
  } catch (e) {
    console.error('[ensure-calendar-schema]', e);
    return false;
  }
}

export function ensureStudentCalendarTables(): Promise<boolean> {
  if (!ensurePromise) ensurePromise = runEnsure();
  return ensurePromise;
}
