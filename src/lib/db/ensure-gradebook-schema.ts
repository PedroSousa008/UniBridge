import { prisma } from '@/lib/db';

let ensurePromise: Promise<boolean> | null = null;

const STATEMENTS: string[] = [
  `ALTER TABLE "GradeCategory" ADD COLUMN IF NOT EXISTS "description" TEXT`,
  `ALTER TABLE "GradeCategory" ADD COLUMN IF NOT EXISTS "rulesJson" JSONB`,
  `ALTER TABLE "GradeCategory" ADD COLUMN IF NOT EXISTS "minGrade" DOUBLE PRECISION`,
  `CREATE TABLE IF NOT EXISTS "StudentGradebookPreference" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "goodMin" DOUBLE PRECISION NOT NULL DEFAULT 14,
    "moderateMin" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "passMin" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "targetGpa" DOUBLE PRECISION,
    "creditsCompleted" INTEGER NOT NULL DEFAULT 0,
    "creditsRequired" INTEGER NOT NULL DEFAULT 180,
    "ectsPerSubject" INTEGER NOT NULL DEFAULT 6,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentGradebookPreference_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "StudentGradebookPreference_studentId_key" ON "StudentGradebookPreference"("studentId")`,
  `DO $$ BEGIN ALTER TABLE "StudentGradebookPreference" ADD CONSTRAINT "StudentGradebookPreference_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
];

async function tableReady(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT "rulesJson" FROM "GradeCategory" LIMIT 1`;
    await prisma.$queryRaw`SELECT 1 FROM "StudentGradebookPreference" LIMIT 1`;
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
      console.error('[ensure-gradebook-schema]', e);
    }
  }
  return tableReady();
}

export function ensureGradebookTables(): Promise<boolean> {
  if (!ensurePromise) {
    ensurePromise = runEnsure().then((ok) => {
      if (!ok) ensurePromise = null;
      return ok;
    });
  }
  return ensurePromise;
}
