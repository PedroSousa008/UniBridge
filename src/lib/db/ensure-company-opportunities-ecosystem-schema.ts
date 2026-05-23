import { prisma } from '@/lib/db';

let ensurePromise: Promise<boolean> | null = null;

const STATEMENTS: string[] = [
  `ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "opportunityCategory" TEXT`,
  `ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "companyRoleId" TEXT`,
  `ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "hiringPriority" TEXT DEFAULT 'normal'`,
  `ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "opensAt" TIMESTAMP(3)`,
  `ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "isFutureOpening" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "ecosystemJson" JSONB`,
  `CREATE TABLE IF NOT EXISTS "CompanyOpportunityStudentLink" (
    "id" TEXT NOT NULL,
    "companyUserId" TEXT NOT NULL,
    "internshipId" TEXT NOT NULL,
    "studentUserId" TEXT NOT NULL,
    "studentProfileId" TEXT,
    "linkType" TEXT NOT NULL DEFAULT 'preview',
    "archivedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompanyOpportunityStudentLink_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "CompanyOpportunityStudentLink_active_key"
    ON "CompanyOpportunityStudentLink"("companyUserId", "internshipId", "studentUserId")
    WHERE "archivedAt" IS NULL`,
  `CREATE INDEX IF NOT EXISTS "CompanyOpportunityStudentLink_internship_idx"
    ON "CompanyOpportunityStudentLink"("internshipId")`,
  `CREATE INDEX IF NOT EXISTS "CompanyOpportunityStudentLink_company_idx"
    ON "CompanyOpportunityStudentLink"("companyUserId")`,
];

async function tableReady(): Promise<boolean> {
  try {
    await prisma.$queryRaw`
      SELECT "id" FROM "CompanyOpportunityStudentLink" LIMIT 1
    `;
    return true;
  } catch {
    return false;
  }
}

async function runEnsure(): Promise<boolean> {
  const ready = await tableReady();
  if (!ready) {
    for (const sql of STATEMENTS) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch (e) {
        console.error('[ensure-company-opportunities-ecosystem-schema]', e);
      }
    }
  }
  for (const sql of STATEMENTS.filter((s) => s.startsWith('ALTER TABLE'))) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (e) {
      console.error('[ensure-company-opportunities-ecosystem-schema:migrate]', e);
    }
  }
  return (await tableReady()) || ready;
}

export function ensureCompanyOpportunitiesEcosystemTables(): Promise<boolean> {
  if (!ensurePromise) {
    ensurePromise = runEnsure().then((ok) => {
      if (!ok) ensurePromise = null;
      return ok;
    });
  }
  return ensurePromise;
}
