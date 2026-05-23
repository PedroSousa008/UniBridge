import { requireSession } from '@/lib/session';
import { requireTeacherSubjectAccess } from '@/lib/teacher/teacher-subject-context';
import { TeacherSubjectCalendarPanel } from '@/components/teacher/teacher-subject-calendar-panel';
import { loadSubjectCalendarHub } from '@/lib/teacher/subject-calendar-hub';

export default async function TeacherSubjectCalendarPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const session = await requireSession('TEACHER');
  const { subjectId } = await params;
  const [{ subject }, hub] = await Promise.all([
    requireTeacherSubjectAccess(session.user.id, subjectId),
    loadSubjectCalendarHub(subjectId),
  ]);

  return (
    <TeacherSubjectCalendarPanel
      subjectId={subjectId}
      subjectName={subject.name}
      initialEvents={hub.events}
      initialRaw={hub.raw}
    />
  );
}
