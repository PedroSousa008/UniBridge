import { prisma } from '@/lib/db';
import { ensureStudentCalendarTables } from '@/lib/db/ensure-calendar-schema';

export const assignmentSourceRef = (assignmentId: string) => `assignment:${assignmentId}`;

export async function syncAssignmentToCalendars(assignmentId: string): Promise<void> {
  const ready = await ensureStudentCalendarTables();
  if (!ready) return;

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      subject: {
        include: { teacher: { select: { userId: true } } },
      },
    },
  });
  if (!assignment) return;

  const start = assignment.dueDate;
  const end = new Date(assignment.dueDate.getTime() + 3600000);
  const userIds = new Set<string>();

  const enrollments = await prisma.subjectEnrollment.findMany({
    where: { subjectId: assignment.subjectId },
    select: { studentId: true },
  });
  for (const e of enrollments) userIds.add(e.studentId);
  const teacherUserId = assignment.subject?.teacher?.userId;
  if (teacherUserId) userIds.add(teacherUserId);

  const ref = assignmentSourceRef(assignment.id);
  const description =
    assignment.instructions ?? assignment.description ?? assignment.subject.name;

  for (const studentId of userIds) {
    const existing = await prisma.studentCalendarEvent.findFirst({
      where: { studentId, sourceRef: ref },
    });
    const payload = {
      title: assignment.title,
      description,
      category: 'ACADEMIC' as const,
      quickType: 'TASK' as const,
      startAt: start,
      endAt: end,
      allDay: false,
      color: '#ef4444',
      professor: assignment.professor,
      sourceRef: ref,
    };

    if (existing) {
      await prisma.studentCalendarEvent.update({ where: { id: existing.id }, data: payload });
    } else {
      await prisma.studentCalendarEvent.create({
        data: { ...payload, studentId, recurrence: 'NONE', taggedEmails: [] },
      });
    }
  }
}

export async function removeAssignmentFromCalendars(assignmentId: string): Promise<void> {
  const ref = assignmentSourceRef(assignmentId);
  await prisma.studentCalendarEvent.deleteMany({ where: { sourceRef: ref } }).catch(() => {});
}
