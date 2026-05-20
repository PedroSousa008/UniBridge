import { prisma } from '@/lib/db';

let ensurePromise: Promise<boolean> | null = null;

const SCHEDULE_SCHEMA_SQL = `
DO $$ BEGIN
  CREATE TYPE "ClassSessionType" AS ENUM ('LECTURE', 'WORKSHOP', 'LAB', 'SEMINAR');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "StudentWeeklyClass" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "subjectId" TEXT,
  "subjectName" TEXT NOT NULL,
  "classType" "ClassSessionType" NOT NULL DEFAULT 'LECTURE',
  "professor" TEXT,
  "dayOfWeek" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "repeatWeekly" BOOLEAN NOT NULL DEFAULT true,
  "building" TEXT,
  "room" TEXT,
  "isOnline" BOOLEAN NOT NULL DEFAULT false,
  "color" TEXT NOT NULL DEFAULT '#3b82f6',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentWeeklyClass_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StudentWeeklyClass_studentId_dayOfWeek_idx"
  ON "StudentWeeklyClass"("studentId", "dayOfWeek");

DO $$ BEGIN
  ALTER TABLE "StudentWeeklyClass"
    ADD CONSTRAINT "StudentWeeklyClass_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "StudentWeeklyClass"
    ADD CONSTRAINT "StudentWeeklyClass_subjectId_fkey"
    FOREIGN KEY ("subjectId") REFERENCES "Subject"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
`;

async function tableExists(): Promise<boolean> {
  try {
    await prisma.studentWeeklyClass.findFirst({ select: { id: true } });
    return true;
  } catch {
    return false;
  }
}

async function runEnsure(): Promise<boolean> {
  if (await tableExists()) return true;

  try {
    await prisma.$executeRawUnsafe(SCHEDULE_SCHEMA_SQL);
    return await tableExists();
  } catch (error) {
    console.error('[ensure-schedule-schema]', error);
    return false;
  }
}

/** Idempotent: creates StudentWeeklyClass + enum on Neon if missing (once per server instance). */
export async function ensureStudentWeeklyClassTable(): Promise<boolean> {
  if (await tableExists()) return true;

  if (!ensurePromise) {
    ensurePromise = runEnsure().then((ok) => {
      if (!ok) ensurePromise = null;
      return ok;
    });
  }
  return ensurePromise;
}
