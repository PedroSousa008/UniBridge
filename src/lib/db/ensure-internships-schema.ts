import { prisma } from '@/lib/db';

let ensurePromise: Promise<boolean> | null = null;

const STATEMENTS: string[] = [
  `ALTER TABLE "InternshipApplication" ADD COLUMN IF NOT EXISTS "appliedAt" TIMESTAMP(3)`,
  `ALTER TABLE "InternshipApplication" ADD COLUMN IF NOT EXISTS "companyResponse" TEXT`,
  `ALTER TABLE "InternshipApplication" ADD COLUMN IF NOT EXISTS "interviewRounds" JSONB`,
  `ALTER TABLE "InternshipApplication" ADD COLUMN IF NOT EXISTS "documentsJson" JSONB`,
  `ALTER TABLE "InternshipApplication" ADD COLUMN IF NOT EXISTS "notes" TEXT`,
  `CREATE TABLE IF NOT EXISTS "StudentInternshipJournal" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "internshipId" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'reflection',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentInternshipJournal_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "StudentInternshipJournal_studentId_idx"
    ON "StudentInternshipJournal"("studentId")`,
  `DO $$ BEGIN ALTER TABLE "StudentInternshipJournal"
    ADD CONSTRAINT "StudentInternshipJournal_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
];

async function tableReady(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1 FROM "StudentInternshipJournal" LIMIT 1`;
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
      console.error('[ensure-internships-schema]', e);
    }
  }
  return tableReady();
}

export function ensureInternshipTables(): Promise<boolean> {
  if (!ensurePromise) {
    ensurePromise = runEnsure().then((ok) => {
      if (!ok) ensurePromise = null;
      return ok;
    });
  }
  return ensurePromise;
}
