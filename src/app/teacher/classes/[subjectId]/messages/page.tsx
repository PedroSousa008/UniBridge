import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/session';
import {
  loadTeacherSubjectMessages,
  requireTeacherSubjectAccess,
  serializeJson,
} from '@/lib/teacher/teacher-subject-context';
import { TeacherSubjectMessagesPanel } from '@/components/teacher/teacher-subject-messages-panel';

export default async function TeacherSubjectMessagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ subjectId: string }>;
  searchParams: Promise<{ studentId?: string; channel?: string }>;
}) {
  const session = await requireSession('TEACHER');
  const { subjectId } = await params;
  const sp = await searchParams;
  const studentId = sp.studentId?.trim();
  const channel = sp.channel === 'direct' && studentId ? 'direct' : 'class';

  await requireTeacherSubjectAccess(session.user.id, subjectId);

  let initialMessages = serializeJson(
    await loadTeacherSubjectMessages(session.user.id, subjectId)
  );
  let composeStudentName: string | undefined;

  if (channel === 'direct' && studentId) {
    const direct = await prisma.subjectMessage.findMany({
      where: { subjectId, channel: 'direct', recipientId: studentId },
      include: { author: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    initialMessages = serializeJson(direct);
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { name: true },
    });
    composeStudentName = student?.name ?? undefined;
  }

  return (
    <TeacherSubjectMessagesPanel
      subjectId={subjectId}
      initialMessages={initialMessages}
      composeStudentId={channel === 'direct' ? studentId : undefined}
      composeStudentName={composeStudentName}
      channel={channel}
    />
  );
}
