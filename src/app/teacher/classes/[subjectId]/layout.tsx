import { requireSession } from '@/lib/session';
import { requireTeacherSubjectAccess } from '@/lib/teacher/teacher-subject-context';
import { TeacherSubjectShell } from '@/components/teacher/teacher-subject-shell';

export default async function TeacherSubjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ subjectId: string }>;
}) {
  const session = await requireSession('TEACHER');
  const { subjectId } = await params;
  const { subject } = await requireTeacherSubjectAccess(session.user.id, subjectId);

  return (
    <TeacherSubjectShell
      subjectId={subject.id}
      subjectName={subject.name}
      subjectCode={subject.code}
      courseName={subject.course?.name ?? null}
      semester={subject.semester}
      year={subject.year}
      studentCount={subject._count.enrollments}
    >
      {children}
    </TeacherSubjectShell>
  );
}
