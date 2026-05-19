import { prisma } from '@/lib/db';

let ensurePromise: Promise<boolean> | null = null;

const STATEMENTS: string[] = [
  `DO $$ BEGIN CREATE TYPE "AttendanceJustificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `ALTER TABLE "Subject" ADD COLUMN IF NOT EXISTS "absenceLimit" INTEGER`,
  `ALTER TABLE "Subject" ADD COLUMN IF NOT EXISTS "minAttendancePercent" DOUBLE PRECISION DEFAULT 75`,
  `UPDATE "Subject" SET "minAttendancePercent" = 75 WHERE "minAttendancePercent" IS NULL`,
  `ALTER TABLE "SubjectAttendanceSession" ADD COLUMN IF NOT EXISTS "canceled" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "SubjectAttendanceSession" ADD COLUMN IF NOT EXISTS "isOnline" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "SubjectAttendanceSession" ADD COLUMN IF NOT EXISTS "movedTo" TIMESTAMP(3)`,
  `ALTER TABLE "SubjectAttendanceSession" ADD COLUMN IF NOT EXISTS "scheduleSlotId" TEXT`,
  `ALTER TABLE "SubjectAttendanceSession" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP`,
  `UPDATE "SubjectAttendanceSession" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "updatedAt" IS NULL`,
  `ALTER TABLE "SubjectAttendanceRecord" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP`,
  `UPDATE "SubjectAttendanceRecord" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "updatedAt" IS NULL`,
  `CREATE TABLE IF NOT EXISTS "AttendanceJustification" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "sessionId" TEXT,
    "reason" TEXT NOT NULL,
    "fileUrl" TEXT,
    "documentUrl" TEXT,
    "status" "AttendanceJustificationStatus" NOT NULL DEFAULT 'PENDING',
    "teacherNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AttendanceJustification_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "AttendanceJustification_studentId_subjectId_idx" ON "AttendanceJustification"("studentId", "subjectId")`,
  `CREATE INDEX IF NOT EXISTS "AttendanceJustification_status_idx" ON "AttendanceJustification"("status")`,
  `DO $$ BEGIN ALTER TABLE "AttendanceJustification" ADD CONSTRAINT "AttendanceJustification_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN ALTER TABLE "AttendanceJustification" ADD CONSTRAINT "AttendanceJustification_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `CREATE TABLE IF NOT EXISTS "TeacherAttendanceNote" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeacherAttendanceNote_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "TeacherAttendanceNote_subjectId_studentId_key" ON "TeacherAttendanceNote"("subjectId", "studentId")`,
  `DO $$ BEGIN ALTER TABLE "TeacherAttendanceNote" ADD CONSTRAINT "TeacherAttendanceNote_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN ALTER TABLE "TeacherAttendanceNote" ADD CONSTRAINT "TeacherAttendanceNote_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
];

async function tableReady(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1 FROM "AttendanceJustification" LIMIT 1`;
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
      console.error('[ensure-attendance-schema]', e);
    }
  }
  return tableReady();
}

export function ensureAttendanceTables(): Promise<boolean> {
  if (!ensurePromise) {
    ensurePromise = runEnsure().then((ok) => {
      if (!ok) ensurePromise = null;
      return ok;
    });
  }
  return ensurePromise;
}
