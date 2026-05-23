import { prisma } from '@/lib/db';

let ready = false;

/** Teacher class groups, private notes, and direct message recipient column. */
export async function ensureTeacherStudentsSchema(): Promise<void> {
  if (ready) return;

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TeacherClassGroup" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "subjectId" TEXT NOT NULL,
      "teacherId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "TeacherClassGroup_subjectId_idx"
    ON "TeacherClassGroup"("subjectId");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TeacherClassGroupMember" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "groupId" TEXT NOT NULL,
      "studentId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("groupId", "studentId")
    );
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "SubjectMessage"
    ADD COLUMN IF NOT EXISTS "recipientId" TEXT;
  `);

  ready = true;
}
