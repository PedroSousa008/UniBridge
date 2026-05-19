import { prisma } from '@/lib/db';
import { ensureStudentCalendarTables } from '@/lib/db/ensure-calendar-schema';

export const examSourceRef = (examId: string) => `exam:${examId}`;

export async function syncExamToCalendars(examId: string): Promise<void> {
  const ready = await ensureStudentCalendarTables();
  if (!ready) return;

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      subject: {
        include: { teacher: { select: { userId: true } } },
      },
    },
  });
  if (!exam) return;

  const start = exam.date;
  const end = exam.endAt ?? new Date(exam.date.getTime() + 2 * 3600000);
  const userIds = new Set<string>();

  if (exam.ownerStudentId) {
    userIds.add(exam.ownerStudentId);
  }

  if (exam.subjectId) {
    const enrollments = await prisma.subjectEnrollment.findMany({
      where: { subjectId: exam.subjectId },
      select: { studentId: true },
    });
    for (const e of enrollments) userIds.add(e.studentId);
    const teacherUserId = exam.subject?.teacher?.userId;
    if (teacherUserId) userIds.add(teacherUserId);
  }

  const ref = examSourceRef(exam.id);
  const location = [exam.building, exam.location].filter(Boolean).join(' · ') || null;

  for (const studentId of userIds) {
    const existing = await prisma.studentCalendarEvent.findFirst({
      where: { studentId, sourceRef: ref },
    });
    const payload = {
      title: exam.title,
      description: exam.subject?.name ?? exam.description,
      category: 'ACADEMIC' as const,
      quickType: 'EXAM' as const,
      startAt: start,
      endAt: end,
      allDay: false,
      color: '#dc2626',
      location,
      room: exam.room,
      professor: exam.professor,
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

export async function removeExamFromCalendars(examId: string): Promise<void> {
  const ref = examSourceRef(examId);
  await prisma.studentCalendarEvent.deleteMany({ where: { sourceRef: ref } }).catch(() => {});
}

export async function createExamFromCalendarEvent(params: {
  studentId: string;
  title: string;
  startAt: Date;
  endAt: Date;
  subjectId?: string | null;
  location?: string | null;
  room?: string | null;
  professor?: string | null;
  calendarEventId?: string;
}): Promise<string | null> {
  try {
    const exam = await prisma.exam.create({
      data: {
        title: params.title,
        date: params.startAt,
        endAt: params.endAt,
        subjectId: params.subjectId || null,
        ownerStudentId: params.subjectId ? null : params.studentId,
        createdById: params.studentId,
        building: params.location,
        room: params.room,
        professor: params.professor,
        location: params.location,
      },
    });
    await syncExamToCalendars(exam.id);
    return exam.id;
  } catch {
    return null;
  }
}
