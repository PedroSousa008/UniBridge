import { Suspense } from 'react';
import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { studentEnrollmentsWhere, getStudentLinkedUniversityId } from '@/lib/academics/enrollments';
import { ensureExamTables } from '@/lib/db/ensure-exam-schema';
import { loadStudentExamsHub } from '@/lib/student/student-exams';
import { ExamsCommandCenter } from '@/components/student/exams/exams-command-center';

export default async function StudentExamsPage() {
  const session = await requireSession('STUDENT');
  const ready = await ensureExamTables();
  const universityId = await getStudentLinkedUniversityId(session.user.id);
  const [exams, enrollments] = await Promise.all([
    ready ? loadStudentExamsHub(session.user.id) : Promise.resolve([]),
    prisma.subjectEnrollment.findMany({
      where: studentEnrollmentsWhere(session.user.id, universityId),
      include: { subject: { select: { id: true, name: true, code: true, status: true } } },
    }),
  ]);

  const subjects = enrollments
    .filter((e) => e.subject.status === 'ACTIVE')
    .map((e) => ({
    id: e.subject.id,
    name: e.subject.name,
    code: e.subject.code,
  }));

  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground p-4">Loading exams…</p>}>
      <ExamsCommandCenter
        userId={session.user.id}
        initialExams={exams}
        subjects={subjects}
        dbSyncNeeded={!ready}
      />
    </Suspense>
  );
}
