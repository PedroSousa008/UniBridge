import { prisma } from '@/lib/db';

let ensurePromise: Promise<boolean> | null = null;

const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "StudentCompatibilitySnapshot" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL DEFAULT 0,
    "employabilityScore" INTEGER NOT NULL DEFAULT 0,
    "scoresJson" JSONB NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentCompatibilitySnapshot_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "StudentCompatibilitySnapshot_studentId_capturedAt_idx"
    ON "StudentCompatibilitySnapshot"("studentId", "capturedAt")`,
  `DO $$ BEGIN ALTER TABLE "StudentCompatibilitySnapshot"
    ADD CONSTRAINT "StudentCompatibilitySnapshot_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `CREATE TABLE IF NOT EXISTS "StudentWorkStyleProfile" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "traits" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentWorkStyleProfile_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "StudentWorkStyleProfile_studentId_key"
    ON "StudentWorkStyleProfile"("studentId")`,
  `DO $$ BEGIN ALTER TABLE "StudentWorkStyleProfile"
    ADD CONSTRAINT "StudentWorkStyleProfile_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
];

async function tableReady(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1 FROM "StudentWorkStyleProfile" LIMIT 1`;
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
      console.error('[ensure-compatibility-schema]', e);
    }
  }
  return tableReady();
}

export function ensureCompatibilityTables(): Promise<boolean> {
  if (!ensurePromise) {
    ensurePromise = runEnsure().then((ok) => {
      if (!ok) ensurePromise = null;
      return ok;
    });
  }
  return ensurePromise;
}
