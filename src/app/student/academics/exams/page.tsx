import { Suspense } from 'react';
import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { ensureExamTables } from '@/lib/db/ensure-exam-schema';
import { loadStudentExamsHub } from '@/lib/student/student-exams';
import { ExamsCommandCenter } from '@/components/student/exams/exams-command-center';

export default async function StudentExamsPage() {
  const session = await requireSession('STUDENT');
  const ready = await ensureExamTables();
  const [exams, enrollments] = await Promise.all([
    ready ? loadStudentExamsHub(session.user.id) : Promise.resolve([]),
    prisma.subjectEnrollment.findMany({
      where: { studentId: session.user.id },
      include: { subject: { select: { id: true, name: true, code: true } } },
    }),
  ]);

  const subjects = enrollments.map((e) => ({
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
