import { prisma } from '@/lib/db';

let ensurePromise: Promise<boolean> | null = null;

const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "SubjectCalendarEvent" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "room" TEXT,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "repeatWeekly" BOOLEAN NOT NULL DEFAULT false,
    "repeatUntil" TIMESTAMP(3),
    "excludeDates" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notifyOnChange" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubjectCalendarEvent_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "SubjectCalendarEvent_subjectId_startAt_idx" ON "SubjectCalendarEvent"("subjectId", "startAt")`,
  `DO $$ BEGIN ALTER TABLE "SubjectCalendarEvent" ADD CONSTRAINT "SubjectCalendarEvent_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN ALTER TABLE "SubjectCalendarEvent" ADD CONSTRAINT "SubjectCalendarEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
];

async function tableReady(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1 FROM "SubjectCalendarEvent" LIMIT 1`;
    return true;
  } catch {
    return false;
  }
}

async function runEnsure(): Promise<boolean> {
  if (await tableReady()) return true;
  for (const sql of STATEMENTS) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (e) {
      console.error('[ensure-subject-calendar-schema]', e);
    }
  }
  return tableReady();
}

export function ensureSubjectCalendarTables(): Promise<boolean> {
  if (!ensurePromise) {
    ensurePromise = runEnsure().finally(() => {
      ensurePromise = null;
    });
  }
  return ensurePromise;
}
