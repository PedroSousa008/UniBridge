import { prisma } from '@/lib/db';

let ensurePromise: Promise<boolean> | null = null;

const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "PartnershipConnection" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "companyUserId" TEXT NOT NULL,
    "companyInterested" BOOLEAN NOT NULL DEFAULT false,
    "universityInterested" BOOLEAN NOT NULL DEFAULT false,
    "companyInterestedAt" TIMESTAMP(3),
    "universityInterestedAt" TIMESTAMP(3),
    "partnershipId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PartnershipConnection_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "PartnershipConnection_universityId_companyUserId_key"
    ON "PartnershipConnection"("universityId", "companyUserId")`,
  `CREATE INDEX IF NOT EXISTS "PartnershipConnection_updatedAt_idx" ON "PartnershipConnection"("updatedAt")`,
  `CREATE TABLE IF NOT EXISTS "PartnershipActivity" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "companyUserId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "kind" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PartnershipActivity_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "PartnershipActivity_createdAt_idx" ON "PartnershipActivity"("createdAt")`,
];

async function tableReady(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1 FROM "PartnershipConnection" LIMIT 1`;
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
      console.error('[ensure-partnership-live-schema]', e);
    }
  }
  return tableReady();
}

export function ensurePartnershipLiveTables(): Promise<boolean> {
  if (!ensurePromise) {
    ensurePromise = runEnsure().then((ok) => {
      if (!ok) ensurePromise = null;
      return ok;
    });
  }
  return ensurePromise;
}
