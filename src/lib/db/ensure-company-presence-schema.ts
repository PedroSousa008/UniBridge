import { prisma } from '@/lib/db';

let ensurePromise: Promise<boolean> | null = null;

const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "CompanyPresenceProfile" (
    "id" TEXT NOT NULL,
    "companyUserId" TEXT NOT NULL,
    "cultureHeadline" TEXT,
    "ownerName" TEXT,
    "totalEmployees" INTEGER,
    "hiringActivity" TEXT DEFAULT 'actively_hiring',
    "mission" TEXT,
    "vision" TEXT,
    "valuesJson" JSONB,
    "workPhilosophy" TEXT,
    "whatWeLookFor" TEXT,
    "growthCulture" TEXT,
    "leadershipStyles" JSONB,
    "nonNegotiables" JSONB,
    "preferredQualities" JSONB,
    "whyJoinJson" JSONB,
    "startupCollaboration" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompanyPresenceProfile_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "CompanyPresenceProfile_companyUserId_key"
    ON "CompanyPresenceProfile"("companyUserId")`,
  `CREATE TABLE IF NOT EXISTS "CompanyDepartment" (
    "id" TEXT NOT NULL,
    "companyUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "occupiedCount" INTEGER NOT NULL DEFAULT 0,
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompanyDepartment_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "CompanyDepartment_companyUserId_idx" ON "CompanyDepartment"("companyUserId")`,
  `CREATE TABLE IF NOT EXISTS "CompanyRole" (
    "id" TEXT NOT NULL,
    "companyUserId" TEXT NOT NULL,
    "departmentId" TEXT,
    "title" TEXT NOT NULL,
    "roleType" TEXT NOT NULL DEFAULT 'internship',
    "description" TEXT,
    "responsibilities" TEXT,
    "expectations" TEXT,
    "requiredSkills" JSONB,
    "preferredSkills" JSONB,
    "nonNegotiables" JSONB,
    "preferredQualities" JSONB,
    "growthOpportunities" TEXT,
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "remoteType" TEXT DEFAULT 'hybrid',
    "location" TEXT,
    "startDate" TIMESTAMP(3),
    "isFilled" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'published',
    "internshipId" TEXT,
    "applicationQuestions" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompanyRole_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "CompanyRole_companyUserId_idx" ON "CompanyRole"("companyUserId")`,
  `CREATE TABLE IF NOT EXISTS "CompanyTeamMember" (
    "id" TEXT NOT NULL,
    "companyUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "photoUrl" TEXT,
    "age" INTEGER,
    "roleTitle" TEXT,
    "memberType" TEXT NOT NULL DEFAULT 'employee',
    "previousUniversity" TEXT,
    "degree" TEXT,
    "bio" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompanyTeamMember_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "CompanyTeamMember_companyUserId_idx" ON "CompanyTeamMember"("companyUserId")`,
];

/** Idempotent column migrations — must run even when base tables already exist. */
const MIGRATION_STATEMENTS: string[] = [
  `ALTER TABLE "CompanyDepartment" ADD COLUMN IF NOT EXISTS "culture" TEXT`,
  `ALTER TABLE "CompanyDepartment" ADD COLUMN IF NOT EXISTS "expectations" TEXT`,
  `ALTER TABLE "CompanyDepartment" ADD COLUMN IF NOT EXISTS "leadershipStyle" TEXT`,
  `ALTER TABLE "CompanyDepartment" ADD COLUMN IF NOT EXISTS "growthPhilosophy" TEXT`,
  `ALTER TABLE "CompanyDepartment" ADD COLUMN IF NOT EXISTS "hiringActivity" TEXT DEFAULT 'active'`,
  `ALTER TABLE "CompanyRole" ADD COLUMN IF NOT EXISTS "hiringPriority" TEXT DEFAULT 'normal'`,
  `ALTER TABLE "CompanyRole" ADD COLUMN IF NOT EXISTS "visibilitySettings" JSONB`,
  `ALTER TABLE "CompanyRole" ADD COLUMN IF NOT EXISTS "applicationSettings" JSONB`,
  `ALTER TABLE "CompanyTeamMember" ADD COLUMN IF NOT EXISTS "departmentId" TEXT`,
];

async function tableReady(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1 FROM "CompanyPresenceProfile" LIMIT 1`;
    return true;
  } catch {
    return false;
  }
}

async function departmentColumnsReady(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT "culture" FROM "CompanyDepartment" LIMIT 1`;
    return true;
  } catch {
    return false;
  }
}

async function runMigrations(): Promise<void> {
  for (const sql of MIGRATION_STATEMENTS) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (e) {
      console.error('[ensure-company-presence-schema:migrate]', e);
    }
  }
}

async function runEnsure(): Promise<boolean> {
  if (!(await tableReady())) {
    for (const sql of STATEMENTS) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch (e) {
        console.error('[ensure-company-presence-schema:create]', e);
      }
    }
  }
  await runMigrations();
  return (await tableReady()) && (await departmentColumnsReady());
}

export function ensureCompanyPresenceTables(): Promise<boolean> {
  if (!ensurePromise) {
    ensurePromise = runEnsure().then((ok) => {
      if (!ok) ensurePromise = null;
      return ok;
    });
  }
  return ensurePromise;
}
