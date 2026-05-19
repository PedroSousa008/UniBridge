import { prisma } from '@/lib/db';

let ensurePromise: Promise<boolean> | null = null;

const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "StudentDocumentPreference" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "hideCompletedSubjects" BOOLEAN NOT NULL DEFAULT false,
    "pinnedIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "starredIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "archivedSubjectIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recentOpens" JSONB,
    "offlineSavedIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentDocumentPreference_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "StudentDocumentPreference_studentId_key" ON "StudentDocumentPreference"("studentId")`,
  `DO $$ BEGIN ALTER TABLE "StudentDocumentPreference" ADD CONSTRAINT "StudentDocumentPreference_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
];

async function tableReady(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1 FROM "StudentDocumentPreference" LIMIT 1`;
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
      console.error('[ensure-documents-schema]', e);
    }
  }
  return tableReady();
}

export function ensureDocumentTables(): Promise<boolean> {
  if (!ensurePromise) {
    ensurePromise = runEnsure().then((ok) => {
      if (!ok) ensurePromise = null;
      return ok;
    });
  }
  return ensurePromise;
}
