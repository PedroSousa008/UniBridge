import { prisma } from '@/lib/db';

let ensurePromise: Promise<boolean> | null = null;

const STATEMENTS: string[] = [
  `ALTER TABLE "CompanyEvent" ADD COLUMN IF NOT EXISTS "eventType" TEXT DEFAULT 'networking'`,
  `ALTER TABLE "CompanyEvent" ADD COLUMN IF NOT EXISTS "eventFormat" TEXT DEFAULT 'hybrid'`,
  `ALTER TABLE "CompanyEvent" ADD COLUMN IF NOT EXISTS "registrationDeadline" TIMESTAMP(3)`,
  `ALTER TABLE "CompanyEvent" ADD COLUMN IF NOT EXISTS "ecosystemJson" JSONB`,
  `CREATE TABLE IF NOT EXISTS "CompanyEventInvite" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "studentUserId" TEXT NOT NULL,
    "inviteType" TEXT NOT NULL DEFAULT 'student',
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompanyEventInvite_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "CompanyEventInvite_event_student_key"
    ON "CompanyEventInvite"("eventId", "studentUserId")`,
  `CREATE INDEX IF NOT EXISTS "CompanyEventInvite_eventId_idx" ON "CompanyEventInvite"("eventId")`,
];

async function ready(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT "eventType" FROM "CompanyEvent" LIMIT 1`;
    return true;
  } catch {
    return false;
  }
}

async function runEnsure(): Promise<boolean> {
  if (await ready()) return true;
  for (const sql of STATEMENTS) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (e) {
      console.error('[ensure-company-events-ecosystem-schema]', e);
    }
  }
  return ready();
}

export function ensureCompanyEventsEcosystemTables(): Promise<boolean> {
  if (!ensurePromise) {
    ensurePromise = runEnsure().then((ok) => {
      if (!ok) ensurePromise = null;
      return ok;
    });
  }
  return ensurePromise;
}
