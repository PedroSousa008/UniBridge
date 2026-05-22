import { requireSession } from '@/lib/session';
import { requireStudentSubjectAccess } from '@/lib/student/subject-context';
import { StudentSubjectCalendarPanel } from '@/components/student/subject/student-subject-calendar-panel';
import { loadSubjectCalendarHub } from '@/lib/teacher/subject-calendar-hub';

export default async function SubjectCalendarPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const session = await requireSession('STUDENT');
  const { subjectId } = await params;
  const { subject } = await requireStudentSubjectAccess(session.user.id, subjectId);
  const hub = await loadSubjectCalendarHub(subjectId, { editable: false });

  return (
    <StudentSubjectCalendarPanel
      subjectId={subjectId}
      subjectName={subject.name}
      initialEvents={hub.events}
      initialRaw={hub.raw}
    />
  );
}
