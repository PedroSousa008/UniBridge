import { requireSession } from '@/lib/session';
import { requireStudentSubjectAccess } from '@/lib/student/subject-context';
import { SubjectShell } from '@/components/student/subject/subject-shell';

export default async function SubjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ subjectId: string }>;
}) {
  const session = await requireSession('STUDENT');
  const { subjectId } = await params;
  const { subject } = await requireStudentSubjectAccess(session.user.id, subjectId);

  return (
    <SubjectShell
      subjectId={subject.id}
      subjectName={subject.name}
      subjectCode={subject.code}
      courseName={subject.course?.name ?? null}
      teacherName={subject.teacher?.user.name ?? null}
    >
      {children}
    </SubjectShell>
  );
}
