import { prisma } from '@/lib/db';

let ensurePromise: Promise<boolean> | null = null;

const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "StudentCvProfile" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "activeVersion" TEXT NOT NULL DEFAULT 'corporate',
    "headline" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentCvProfile_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "StudentCvProfile_studentProfileId_key"
    ON "StudentCvProfile"("studentProfileId")`,
  `DO $$ BEGIN ALTER TABLE "StudentCvProfile"
    ADD CONSTRAINT "StudentCvProfile_studentProfileId_fkey"
    FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `CREATE TABLE IF NOT EXISTS "CvEntry" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "body" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "sourceType" TEXT,
    "sourceId" TEXT,
    "verifiedBy" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CvEntry_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "CvEntry_profileId_section_idx"
    ON "CvEntry"("profileId", "section")`,
  `DO $$ BEGIN ALTER TABLE "CvEntry"
    ADD CONSTRAINT "CvEntry_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "StudentCvProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
];

async function tableReady(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1 FROM "StudentCvProfile" LIMIT 1`;
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
      console.error('[ensure-cv-schema]', e);
    }
  }
  return tableReady();
}

export function ensureCvTables(): Promise<boolean> {
  if (!ensurePromise) {
    ensurePromise = runEnsure().then((ok) => {
      if (!ok) ensurePromise = null;
      return ok;
    });
  }
  return ensurePromise;
}
