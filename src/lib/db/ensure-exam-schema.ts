import { prisma } from '@/lib/db';

let ensurePromise: Promise<boolean> | null = null;

/** Run one statement at a time — Prisma/Neon often reject multi-statement raw SQL. */
const EXAM_SCHEMA_STATEMENTS: string[] = [
  `DO $$ BEGIN CREATE TYPE "ExamPriorityLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE "ExamContentKind" AS ENUM ('LECTURE', 'WORKSHOP', 'DOCUMENT', 'TOPIC'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "createdById" TEXT`,
  `ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "ownerStudentId" TEXT`,
  `ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "endAt" TIMESTAMP(3)`,
  `ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "building" TEXT`,
  `ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "room" TEXT`,
  `ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "seatNumber" TEXT`,
  `ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "onlineUrl" TEXT`,
  `ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "professor" TEXT`,
  `ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "description" TEXT`,
  `ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "difficulty" INTEGER DEFAULT 3`,
  `ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "weight" DOUBLE PRECISION DEFAULT 1`,
  `ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "contentVolume" INTEGER DEFAULT 5`,
  `ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "classAverage" DOUBLE PRECISION`,
  `ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP`,
  `UPDATE "Exam" SET "difficulty" = 3 WHERE "difficulty" IS NULL`,
  `UPDATE "Exam" SET "weight" = 1 WHERE "weight" IS NULL`,
  `UPDATE "Exam" SET "contentVolume" = 5 WHERE "contentVolume" IS NULL`,
  `UPDATE "Exam" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "updatedAt" IS NULL`,
  `ALTER TABLE "Exam" ALTER COLUMN "subjectId" DROP NOT NULL`,
  `UPDATE "Exam" e SET "createdById" = tp."userId" FROM "Subject" s JOIN "TeacherProfile" tp ON tp."id" = s."teacherId" WHERE e."subjectId" = s."id" AND e."createdById" IS NULL`,
  `UPDATE "Exam" SET "createdById" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1) WHERE "createdById" IS NULL`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM "Exam" WHERE "createdById" IS NULL) THEN
      ALTER TABLE "Exam" ALTER COLUMN "createdById" SET NOT NULL;
    END IF;
  EXCEPTION WHEN others THEN NULL; END $$`,
  `DO $$ BEGIN ALTER TABLE "Exam" ADD CONSTRAINT "Exam_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `CREATE INDEX IF NOT EXISTS "Exam_createdById_idx" ON "Exam"("createdById")`,
  `CREATE INDEX IF NOT EXISTS "Exam_ownerStudentId_idx" ON "Exam"("ownerStudentId")`,
  `CREATE TABLE IF NOT EXISTS "ExamIncludedContent" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "kind" "ExamContentKind" NOT NULL,
    "label" TEXT NOT NULL,
    "contentItemId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isOfficial" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExamIncludedContent_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "ExamIncludedContent_examId_idx" ON "ExamIncludedContent"("examId")`,
  `DO $$ BEGIN ALTER TABLE "ExamIncludedContent" ADD CONSTRAINT "ExamIncludedContent_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `CREATE TABLE IF NOT EXISTS "ExamAttachment" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "studentId" TEXT,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "fileUrl" TEXT,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExamAttachment_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "ExamAttachment_examId_idx" ON "ExamAttachment"("examId")`,
  `DO $$ BEGIN ALTER TABLE "ExamAttachment" ADD CONSTRAINT "ExamAttachment_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `CREATE TABLE IF NOT EXISTS "StudentExamPreparation" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "prepPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lecturesDone" INTEGER NOT NULL DEFAULT 0,
    "workshopsDone" INTEGER NOT NULL DEFAULT 0,
    "documentsDone" INTEGER NOT NULL DEFAULT 0,
    "revisionsDone" INTEGER NOT NULL DEFAULT 0,
    "checklist" JSONB,
    "personalNotes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentExamPreparation_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "StudentExamPreparation_examId_studentId_key" ON "StudentExamPreparation"("examId", "studentId")`,
  `DO $$ BEGIN ALTER TABLE "StudentExamPreparation" ADD CONSTRAINT "StudentExamPreparation_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN ALTER TABLE "StudentExamPreparation" ADD CONSTRAINT "StudentExamPreparation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `CREATE TABLE IF NOT EXISTS "StudentExamPersonalResource" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "url" TEXT,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentExamPersonalResource_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "StudentExamPersonalResource_examId_studentId_idx" ON "StudentExamPersonalResource"("examId", "studentId")`,
  `DO $$ BEGIN ALTER TABLE "StudentExamPersonalResource" ADD CONSTRAINT "StudentExamPersonalResource_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
];

async function tableReady(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT "createdById" FROM "Exam" LIMIT 1`;
    await prisma.$queryRaw`SELECT 1 FROM "StudentExamPreparation" LIMIT 1`;
    return true;
  } catch {
    return false;
  }
}

async function runEnsure(): Promise<boolean> {
  if (await tableReady()) return true;

  for (const sql of EXAM_SCHEMA_STATEMENTS) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (e) {
      console.error('[ensure-exam-schema] statement failed:', e);
    }
  }

  return tableReady();
}

export function ensureExamTables(): Promise<boolean> {
  if (!ensurePromise) {
    ensurePromise = runEnsure().then((ok) => {
      if (!ok) ensurePromise = null;
      return ok;
    });
  }
  return ensurePromise;
}
