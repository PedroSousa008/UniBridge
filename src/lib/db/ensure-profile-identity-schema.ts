import { prisma } from '@/lib/db';

let ensurePromise: Promise<boolean> | null = null;

const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "StudentIdentitySettings" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "age" INTEGER,
    "personalLocation" TEXT,
    "linkedIn" TEXT,
    "portfolioUrl" TEXT,
    "phone" TEXT,
    "languages" JSONB,
    "interests" JSONB,
    "careerIndustries" JSONB,
    "careerRoles" JSONB,
    "careerGoals" JSONB,
    "dreamCompanies" JSONB,
    "openToInternships" BOOLEAN NOT NULL DEFAULT true,
    "openToNetworking" BOOLEAN NOT NULL DEFAULT false,
    "openToStartup" BOOLEAN NOT NULL DEFAULT false,
    "openToFullTime" BOOLEAN NOT NULL DEFAULT false,
    "visibilityProfile" TEXT NOT NULL DEFAULT 'university',
    "visibilityCv" TEXT NOT NULL DEFAULT 'private',
    "visibilityProjects" TEXT NOT NULL DEFAULT 'companies',
    "visibilityNetworking" TEXT NOT NULL DEFAULT 'private',
    "visibilityAchievements" TEXT NOT NULL DEFAULT 'public',
    "visibilityOpportunities" TEXT NOT NULL DEFAULT 'companies',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentIdentitySettings_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "StudentIdentitySettings_studentProfileId_key"
    ON "StudentIdentitySettings"("studentProfileId")`,
  `DO $$ BEGIN ALTER TABLE "StudentIdentitySettings"
    ADD CONSTRAINT "StudentIdentitySettings_studentProfileId_fkey"
    FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `CREATE TABLE IF NOT EXISTS "StudentProfileProject" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "linkUrl" TEXT,
    "fileUrl" TEXT,
    "tags" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentProfileProject_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "StudentProfileProject_studentProfileId_idx"
    ON "StudentProfileProject"("studentProfileId")`,
  `DO $$ BEGIN ALTER TABLE "StudentProfileProject"
    ADD CONSTRAINT "StudentProfileProject_studentProfileId_fkey"
    FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `CREATE TABLE IF NOT EXISTS "StudentProfileAchievement" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentProfileAchievement_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "StudentProfileAchievement_studentProfileId_idx"
    ON "StudentProfileAchievement"("studentProfileId")`,
  `DO $$ BEGIN ALTER TABLE "StudentProfileAchievement"
    ADD CONSTRAINT "StudentProfileAchievement_studentProfileId_fkey"
    FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
];

async function tableReady(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1 FROM "StudentIdentitySettings" LIMIT 1`;
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
      console.error('[ensure-profile-identity-schema]', e);
    }
  }
  return tableReady();
}

export function ensureProfileIdentityTables(): Promise<boolean> {
  if (!ensurePromise) {
    ensurePromise = runEnsure().then((ok) => {
      if (!ok) ensurePromise = null;
      return ok;
    });
  }
  return ensurePromise;
}
