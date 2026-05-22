import { requireSession } from '@/lib/session';
import { TeacherSubjectCalendarPanel } from '@/components/teacher/teacher-subject-calendar-panel';
import { loadSubjectCalendarHub } from '@/lib/teacher/subject-calendar-hub';
import {
  loadTeacherSubjectWorkspace,
  serializeTeacherSubjectWorkspace,
} from '@/lib/teacher/teacher-subject-context';

export default async function TeacherSubjectCalendarPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const session = await requireSession('TEACHER');
  const { subjectId } = await params;
  const ws = serializeTeacherSubjectWorkspace(
    await loadTeacherSubjectWorkspace(session.user.id, subjectId)
  );
  const hub = await loadSubjectCalendarHub(subjectId);

  return (
    <TeacherSubjectCalendarPanel
      subjectId={subjectId}
      subjectName={ws.subject.name}
      initialEvents={hub.events}
      initialRaw={hub.raw}
    />
  );
}
