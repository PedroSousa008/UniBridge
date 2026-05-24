import { prisma } from '@/lib/db';

let ensurePromise: Promise<boolean> | null = null;

const STATEMENTS: string[] = [
  `ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "bannerUrl" TEXT`,
  `ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "themeColor" TEXT`,
  `ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "visualTheme" TEXT`,
  `ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "requiredCredits" INTEGER DEFAULT 180`,
  `ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "studentNumber" TEXT`,
  `ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "academicStatus" TEXT DEFAULT 'active'`,
  `ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "currentSemester" TEXT`,
  `ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "scholarshipStatus" TEXT`,
  `ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "personalEmail" TEXT`,
  `ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "emergencyContact" TEXT`,
  `ALTER TABLE "SubjectEnrollment" ADD COLUMN IF NOT EXISTS "completionStatus" TEXT`,
  `ALTER TABLE "SubjectEnrollment" ADD COLUMN IF NOT EXISTS "adminNotes" TEXT`,
];

async function columnsReady(): Promise<boolean> {
  try {
    await prisma.$queryRaw`
      SELECT "bannerUrl", "requiredCredits" FROM "Course" LIMIT 1
    `;
    await prisma.$queryRaw`
      SELECT "studentNumber", "academicStatus" FROM "StudentProfile" LIMIT 1
    `;
    await prisma.$queryRaw`
      SELECT "completionStatus", "adminNotes" FROM "SubjectEnrollment" LIMIT 1
    `;
    return true;
  } catch {
    return false;
  }
}

async function runEnsure(): Promise<boolean> {
  if (await columnsReady()) return true;
  for (const sql of STATEMENTS) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (e) {
      console.error('[ensure-student-academic-profile-schema]', e);
    }
  }
  return columnsReady();
}

export function ensureStudentAcademicProfileSchema(): Promise<boolean> {
  if (!ensurePromise) {
    ensurePromise = runEnsure().finally(() => {
      ensurePromise = null;
    });
  }
  return ensurePromise;
}
