import { prisma } from '@/lib/db';

let ensurePromise: Promise<boolean> | null = null;

const STATEMENTS: string[] = [
  `ALTER TABLE "Subject" ADD COLUMN IF NOT EXISTS "credits" INTEGER`,
];

async function columnsReady(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT "credits" FROM "Subject" LIMIT 1`;
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
      console.error('[ensure-subject-credits-schema]', e);
    }
  }
  return columnsReady();
}

export function ensureSubjectCreditsColumn(): Promise<boolean> {
  if (!ensurePromise) {
    ensurePromise = runEnsure().finally(() => {
      ensurePromise = null;
    });
  }
  return ensurePromise;
}
