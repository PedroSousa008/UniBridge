import { prisma } from '@/lib/db';

let ensurePromise: Promise<boolean> | null = null;

const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "CompanyPipelineCandidate" (
    "id" TEXT NOT NULL,
    "companyUserId" TEXT NOT NULL,
    "studentUserId" TEXT NOT NULL,
    "studentProfileId" TEXT,
    "applicationId" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'saved',
    "rating" INTEGER,
    "tags" JSONB,
    "internalNotes" TEXT,
    "assignedTo" TEXT,
    "reminderAt" TIMESTAMP(3),
    "aiLabels" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompanyPipelineCandidate_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "CompanyPipelineCandidate_companyUserId_studentUserId_key"
    ON "CompanyPipelineCandidate"("companyUserId", "studentUserId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "CompanyPipelineCandidate_applicationId_key"
    ON "CompanyPipelineCandidate"("applicationId") WHERE "applicationId" IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS "CompanyPipelineCandidate_companyUserId_stage_idx"
    ON "CompanyPipelineCandidate"("companyUserId", "stage")`,
  `CREATE TABLE IF NOT EXISTS "CompanyPipelineInterview" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "meetingLink" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "calendarSynced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompanyPipelineInterview_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "CompanyPipelineInterview_pipelineId_idx" ON "CompanyPipelineInterview"("pipelineId")`,
  `DO $$ BEGIN ALTER TABLE "CompanyPipelineInterview"
    ADD CONSTRAINT "CompanyPipelineInterview_pipelineId_fkey"
    FOREIGN KEY ("pipelineId") REFERENCES "CompanyPipelineCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `CREATE TABLE IF NOT EXISTS "CompanyPipelineMessage" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompanyPipelineMessage_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "CompanyPipelineMessage_pipelineId_idx" ON "CompanyPipelineMessage"("pipelineId")`,
  `DO $$ BEGIN ALTER TABLE "CompanyPipelineMessage"
    ADD CONSTRAINT "CompanyPipelineMessage_pipelineId_fkey"
    FOREIGN KEY ("pipelineId") REFERENCES "CompanyPipelineCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `CREATE TABLE IF NOT EXISTS "CompanyEvent" (
    "id" TEXT NOT NULL,
    "companyUserId" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "coverUrl" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_approval',
    "targetDegrees" JSONB,
    "targetYears" JSONB,
    "targetSkills" JSONB,
    "capacity" INTEGER,
    "location" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "speakers" JSONB,
    "sponsors" JSONB,
    "scheduleJson" JSONB,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "rejectedReason" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompanyEvent_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "CompanyEvent_companyUserId_idx" ON "CompanyEvent"("companyUserId")`,
  `CREATE INDEX IF NOT EXISTS "CompanyEvent_universityId_status_idx" ON "CompanyEvent"("universityId", "status")`,
  `CREATE TABLE IF NOT EXISTS "CompanyEventRsvp" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "studentUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'rsvp',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompanyEventRsvp_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "CompanyEventRsvp_eventId_studentUserId_key"
    ON "CompanyEventRsvp"("eventId", "studentUserId")`,
  `DO $$ BEGIN ALTER TABLE "CompanyEventRsvp"
    ADD CONSTRAINT "CompanyEventRsvp_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "CompanyEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
];

const MIGRATION_STATEMENTS: string[] = [
  `ALTER TABLE "CompanyPipelineCandidate" ADD COLUMN IF NOT EXISTS "isFollowed" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "CompanyPipelineCandidate" ADD COLUMN IF NOT EXISTS "notesJson" JSONB`,
  `ALTER TABLE "CompanyPipelineCandidate" ADD COLUMN IF NOT EXISTS "timelineJson" JSONB`,
  `ALTER TABLE "CompanyPipelineCandidate" ADD COLUMN IF NOT EXISTS "ecosystemSignals" JSONB`,
  `ALTER TABLE "CompanyPipelineCandidate" ADD COLUMN IF NOT EXISTS "growthPercent" INTEGER`,
];

async function tableReady(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1 FROM "CompanyPipelineCandidate" LIMIT 1`;
    return true;
  } catch {
    return false;
  }
}

async function runMigrations(): Promise<void> {
  for (const sql of MIGRATION_STATEMENTS) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (e) {
      console.error('[ensure-company-ecosystem-schema:migrate]', e);
    }
  }
}

async function runEnsure(): Promise<boolean> {
  if (!(await tableReady())) {
    for (const sql of STATEMENTS) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch (e) {
        console.error('[ensure-company-ecosystem-schema]', e);
      }
    }
  }
  await runMigrations();
  return tableReady();
}

export function ensureCompanyEcosystemTables(): Promise<boolean> {
  if (!ensurePromise) {
    ensurePromise = runEnsure().then((ok) => {
      if (!ok) ensurePromise = null;
      return ok;
    });
  }
  return ensurePromise;
}
