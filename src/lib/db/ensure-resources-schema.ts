import { prisma } from '@/lib/db';

let ensurePromise: Promise<boolean> | null = null;

const STATEMENTS: string[] = [
  `DO $$ BEGIN CREATE TYPE "ResourceScope" AS ENUM ('INTERNAL', 'EXTERNAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE "ResourceHubCategory" AS ENUM ('CAREER', 'STARTUP', 'UNIVERSITY', 'SUBJECT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `CREATE TABLE IF NOT EXISTS "ResourceCatalogItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ResourceHubCategory" NOT NULL,
    "subcategory" TEXT,
    "scope" "ResourceScope" NOT NULL DEFAULT 'EXTERNAL',
    "url" TEXT,
    "internalPath" TEXT,
    "iconKey" TEXT NOT NULL DEFAULT 'link',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "keywords" TEXT NOT NULL DEFAULT '',
    "universityId" TEXT,
    "subjectId" TEXT,
    "recommendedById" TEXT,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "isTrending" BOOLEAN NOT NULL DEFAULT false,
    "saveCount" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResourceCatalogItem_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "ResourceCatalogItem_category_idx" ON "ResourceCatalogItem"("category")`,
  `CREATE INDEX IF NOT EXISTS "ResourceCatalogItem_subjectId_idx" ON "ResourceCatalogItem"("subjectId")`,
  `CREATE INDEX IF NOT EXISTS "ResourceCatalogItem_universityId_idx" ON "ResourceCatalogItem"("universityId")`,
  `CREATE TABLE IF NOT EXISTS "StudentResourcePreference" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "savedIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pinnedIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "favoriteIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "quickLists" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentResourcePreference_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "StudentResourcePreference_studentId_key" ON "StudentResourcePreference"("studentId")`,
  `DO $$ BEGIN ALTER TABLE "StudentResourcePreference" ADD CONSTRAINT "StudentResourcePreference_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
];

async function tableReady(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1 FROM "StudentResourcePreference" LIMIT 1`;
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
      console.error('[ensure-resources-schema]', e);
    }
  }
  return tableReady();
}

export function ensureResourceTables(): Promise<boolean> {
  if (!ensurePromise) {
    ensurePromise = runEnsure().then((ok) => {
      if (!ok) ensurePromise = null;
      return ok;
    });
  }
  return ensurePromise;
}
