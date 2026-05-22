import { prisma } from '@/lib/db';
import { ensureAssignmentTables } from '@/lib/db/ensure-assignment-schema';

export type SubmissionGradeRow = {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  submittedAt: string | null;
  draftScore: number | null;
  score: number | null;
  gradePublished: boolean;
  teacherFeedback: string | null;
};

/** Score visible to the student only after publish. */
export function studentVisibleScore(sub: {
  score: number | null;
  gradePublished?: boolean | null;
}): number | null {
  if (sub.gradePublished) return sub.score ?? null;
  return null;
}

export async function saveTeacherSubmissionGrade(input: {
  submissionId: string;
  teacherUserId: string;
  draftScore?: number | null;
  teacherFeedback?: string | null;
  publish?: boolean;
}): Promise<{ ok: boolean; error?: string; submission?: SubmissionGradeRow }> {
  await ensureAssignmentTables();

  const sub = await prisma.assignmentSubmission.findUnique({
    where: { id: input.submissionId },
    include: {
      assignment: { include: { subject: true } },
      student: { select: { id: true, name: true, email: true } },
    },
  });
  if (!sub?.assignment?.subjectId) return { ok: false, error: 'Submission not found' };

  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId: input.teacherUserId },
  });
  if (!teacher) return { ok: false, error: 'Unauthorized' };

  const subject = await prisma.subject.findFirst({
    where: {
      id: sub.assignment.subjectId,
      OR: [{ teacherId: teacher.id }, { universityId: teacher.universityId ?? undefined }],
    },
  });
  if (!subject) return { ok: false, error: 'Not your class' };

  const draftScore =
    input.draftScore === undefined || input.draftScore === null
      ? undefined
      : Number(input.draftScore);
  const teacherFeedback =
    input.teacherFeedback === undefined ? undefined : input.teacherFeedback;

  const publish = !!input.publish;
  const finalScore = publish
    ? (draftScore ?? (sub as { draftScore?: number | null }).draftScore ?? sub.score)
    : undefined;

  if (publish && (finalScore == null || Number.isNaN(finalScore))) {
    return { ok: false, error: 'Enter a grade before publishing' };
  }

  await prisma.$executeRaw`
    UPDATE "AssignmentSubmission"
    SET
      "draftScore" = COALESCE(${draftScore ?? null}, "draftScore"),
      "teacherFeedback" = COALESCE(${teacherFeedback ?? null}, "teacherFeedback"),
      "score" = CASE WHEN ${publish} THEN ${finalScore ?? null}::double precision ELSE "score" END,
      "gradePublished" = CASE WHEN ${publish} THEN true ELSE "gradePublished" END,
      "publishedAt" = CASE WHEN ${publish} THEN CURRENT_TIMESTAMP ELSE "publishedAt" END,
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${input.submissionId}
  `;

  if (publish) {
    await prisma.studentAssignmentProgress.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId: sub.assignmentId,
          studentId: sub.studentId,
        },
      },
      create: {
        assignmentId: sub.assignmentId,
        studentId: sub.studentId,
        status: 'GRADED',
        progressPercent: 100,
      },
      update: { status: 'GRADED', progressPercent: 100 },
    });

    await prisma.notification.create({
      data: {
        userId: sub.studentId,
        type: 'ASSIGNMENT',
        title: 'Grade published',
        message: `Your grade for "${sub.assignment.title}" is now available in the gradebook.`,
        link: '/student/academics/gradebook',
      },
    });
  }

  const updated = await prisma.assignmentSubmission.findUnique({
    where: { id: input.submissionId },
    include: { student: { select: { id: true, name: true, email: true } } },
  });
  if (!updated) return { ok: false, error: 'Update failed' };

  const row = updated as typeof updated & {
    draftScore?: number | null;
    gradePublished?: boolean;
    teacherFeedback?: string | null;
  };

  return {
    ok: true,
    submission: {
      id: updated.id,
      studentId: updated.studentId,
      studentName: updated.student?.name ?? 'Student',
      studentEmail: updated.student?.email ?? '',
      submittedAt: updated.submittedAt?.toISOString() ?? null,
      draftScore: row.draftScore ?? null,
      score: row.score,
      gradePublished: row.gradePublished ?? false,
      teacherFeedback: row.teacherFeedback ?? null,
    },
  };
}
