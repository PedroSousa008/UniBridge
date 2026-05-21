import { prisma } from '@/lib/db';

let ensurePromise: Promise<boolean> | null = null;

const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "CompanyWorkspaceMember" (
    "id" TEXT NOT NULL,
    "workspaceOwnerId" TEXT NOT NULL,
    "userId" TEXT,
    "teamMemberId" TEXT,
    "permission" TEXT NOT NULL DEFAULT 'VIEWER',
    "accountType" TEXT NOT NULL DEFAULT 'Team Member',
    "phone" TEXT,
    "age" INTEGER,
    "roleInCompany" TEXT,
    "personalBio" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompanyWorkspaceMember_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "CompanyWorkspaceMember_userId_key"
    ON "CompanyWorkspaceMember"("userId") WHERE "userId" IS NOT NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "CompanyWorkspaceMember_teamMemberId_key"
    ON "CompanyWorkspaceMember"("teamMemberId") WHERE "teamMemberId" IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS "CompanyWorkspaceMember_workspaceOwnerId_idx"
    ON "CompanyWorkspaceMember"("workspaceOwnerId")`,
  `CREATE TABLE IF NOT EXISTS "CompanyWorkspaceActivity" (
    "id" TEXT NOT NULL,
    "workspaceOwnerId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompanyWorkspaceActivity_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "CompanyWorkspaceActivity_workspaceOwnerId_createdAt_idx"
    ON "CompanyWorkspaceActivity"("workspaceOwnerId", "createdAt")`,
  `ALTER TABLE "PartnershipConnection" ADD COLUMN IF NOT EXISTS "archived" BOOLEAN NOT NULL DEFAULT false`,
];

async function tableReady(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1 FROM "CompanyWorkspaceMember" LIMIT 1`;
    return true;
  } catch {
    return false;
  }
}

async function runEnsure(): Promise<boolean> {
  if (!(await tableReady())) {
    for (const sql of STATEMENTS) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch (e) {
        console.error('[ensure-company-workspace-schema]', e);
      }
    }
  } else {
    for (const sql of STATEMENTS.slice(-1)) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch {
        /* migration only */
      }
    }
  }
  return tableReady();
}

export function ensureCompanyWorkspaceTables(): Promise<boolean> {
  if (!ensurePromise) {
    ensurePromise = runEnsure().then((ok) => {
      if (!ok) ensurePromise = null;
      return ok;
    });
  }
  return ensurePromise;
}
