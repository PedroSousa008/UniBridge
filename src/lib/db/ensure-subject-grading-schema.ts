import { prisma } from '@/lib/db';

let ensurePromise: Promise<boolean> | null = null;

const STATEMENTS: string[] = [
  `ALTER TABLE "Subject" ADD COLUMN IF NOT EXISTS "gradingMode" TEXT DEFAULT 'continuous_final'`,
  `ALTER TABLE "Subject" ADD COLUMN IF NOT EXISTS "gradingScaleMax" DOUBLE PRECISION DEFAULT 20`,
  `ALTER TABLE "Subject" ADD COLUMN IF NOT EXISTS "gradingBlocksConfirmed" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "Subject" ADD COLUMN IF NOT EXISTS "gradingFinalExamReplacementRule" BOOLEAN NOT NULL DEFAULT false`,
];

async function columnsReady(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT "gradingMode", "gradingScaleMax", "gradingBlocksConfirmed", "gradingFinalExamReplacementRule" FROM "Subject" LIMIT 1`;
    return true;
  } catch {
    return false;
  }
}

async function runEnsure(): Promise<boolean> {
  if (await columnsReady()) return true;
  for (const sql of STATEMENTS) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (e) {
      console.error('[ensure-subject-grading-schema]', e);
    }
  }
  return columnsReady();
}

export function ensureSubjectGradingColumns(): Promise<boolean> {
  if (!ensurePromise) {
    ensurePromise = runEnsure().finally(() => {
      ensurePromise = null;
    });
  }
  return ensurePromise;
}
