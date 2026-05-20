import { prisma } from '@/lib/db';

let ensurePromise: Promise<boolean> | null = null;

const STATEMENTS: string[] = [
  `ALTER TABLE "InternshipApplication" ADD COLUMN IF NOT EXISTS "priority" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "InternshipApplication" ADD COLUMN IF NOT EXISTS "category" TEXT DEFAULT 'internship'`,
  `ALTER TABLE "InternshipApplication" ADD COLUMN IF NOT EXISTS "nextAction" TEXT`,
  `ALTER TABLE "InternshipApplication" ADD COLUMN IF NOT EXISTS "interactionHistory" JSONB`,
  `ALTER TABLE "InternshipApplication" ADD COLUMN IF NOT EXISTS "reflectionsJson" JSONB`,
];

async function columnReady(): Promise<boolean> {
  try {
    await prisma.$queryRaw`
      SELECT "priority" FROM "InternshipApplication" LIMIT 1
    `;
    return true;
  } catch {
    return false;
  }
}

async function runEnsure(): Promise<boolean> {
  if (await columnReady()) return true;
  for (const sql of STATEMENTS) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (e) {
      console.error('[ensure-opportunities-schema]', e);
    }
  }
  return columnReady();
}

export function ensureOpportunityTables(): Promise<boolean> {
  if (!ensurePromise) {
    ensurePromise = runEnsure().then((ok) => {
      if (!ok) ensurePromise = null;
      return ok;
    });
  }
  return ensurePromise;
}
