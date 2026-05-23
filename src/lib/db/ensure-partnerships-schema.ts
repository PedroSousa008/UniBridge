import { prisma } from '@/lib/db';

let ensurePromise: Promise<boolean> | null = null;

const STATEMENTS: string[] = [
  `ALTER TABLE "CompanyProfile" ADD COLUMN IF NOT EXISTS "headquarters" TEXT`,
  `ALTER TABLE "CompanyPartnership" ADD COLUMN IF NOT EXISTS "partnershipTier" TEXT`,
  `ALTER TABLE "CompanyPartnership" ADD COLUMN IF NOT EXISTS "hiringStatus" TEXT DEFAULT 'active'`,
  `ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "partnershipId" TEXT`,
  `ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "department" TEXT`,
  `ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "remoteType" TEXT DEFAULT 'on_site'`,
  `ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "employmentType" TEXT DEFAULT 'internship'`,
  `ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "salaryMin" INTEGER`,
  `ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "salaryMax" INTEGER`,
  `ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "deadline" TIMESTAMP(3)`,
  `ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "availabilityStatus" TEXT DEFAULT 'available'`,
  `ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "currentlyHiring" BOOLEAN NOT NULL DEFAULT true`,
  `ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "positionHolderJson" JSONB`,
  `ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "recommendedSkills" TEXT[] DEFAULT ARRAY[]::TEXT[]`,
  `ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "compatibilityCriteria" TEXT`,
  `ALTER TABLE "InternshipApplication" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP`,
  `CREATE TABLE IF NOT EXISTS "CompanyPartnershipBookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "partnershipId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompanyPartnershipBookmark_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "CompanyPartnershipBookmark_userId_partnershipId_key"
    ON "CompanyPartnershipBookmark"("userId", "partnershipId")`,
  `DO $$ BEGIN ALTER TABLE "CompanyPartnershipBookmark"
    ADD CONSTRAINT "CompanyPartnershipBookmark_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN ALTER TABLE "CompanyPartnershipBookmark"
    ADD CONSTRAINT "CompanyPartnershipBookmark_partnershipId_fkey"
    FOREIGN KEY ("partnershipId") REFERENCES "CompanyPartnership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `CREATE TABLE IF NOT EXISTS "InternshipBookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "internshipId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InternshipBookmark_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "InternshipBookmark_userId_internshipId_key"
    ON "InternshipBookmark"("userId", "internshipId")`,
  `DO $$ BEGIN ALTER TABLE "InternshipBookmark"
    ADD CONSTRAINT "InternshipBookmark_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN ALTER TABLE "InternshipBookmark"
    ADD CONSTRAINT "InternshipBookmark_internshipId_fkey"
    FOREIGN KEY ("internshipId") REFERENCES "Internship"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
];

async function tableReady(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1 FROM "InternshipBookmark" LIMIT 1`;
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
      console.error('[ensure-partnerships-schema]', e);
    }
  }
  return tableReady();
}

export function ensurePartnershipTables(): Promise<boolean> {
  if (!ensurePromise) {
    ensurePromise = runEnsure().then((ok) => {
      if (!ok) ensurePromise = null;
      return ok;
    });
  }
  return ensurePromise;
}
