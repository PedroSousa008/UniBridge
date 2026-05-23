import { prisma } from '@/lib/db';

let ensurePromise: Promise<void> | null = null;

const STATEMENTS = [
  `ALTER TABLE "CompanyRole" ADD COLUMN IF NOT EXISTS "currentlyHiring" BOOLEAN NOT NULL DEFAULT true`,
  `ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "currentlyHiring" BOOLEAN NOT NULL DEFAULT true`,
];

/** Always run — older DBs may have base tables without these columns. */
export function ensureRecruitmentHiringColumns(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      for (const sql of STATEMENTS) {
        try {
          await prisma.$executeRawUnsafe(sql);
        } catch (e) {
          console.error('[ensure-recruitment-hiring-columns]', e);
        }
      }
    })();
  }
  return ensurePromise;
}
