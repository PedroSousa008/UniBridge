import { prisma } from '@/lib/db';
import { ensureStudentCalendarTables } from '@/lib/db/ensure-calendar-schema';

export const attendanceSessionSourceRef = (sessionId: string) => `attendance:${sessionId}`;

/** Recompute enrollment.attendance from non-canceled session records. */
export async function recalculateEnrollmentAttendance(
  subjectId: string,
  studentId: string
): Promise<number | null> {
  const sessions = await prisma.subjectAttendanceSession.findMany({
    where: { subjectId, canceled: false },
    include: { records: { where: { studentId } } },
  });

  const records = sessions.flatMap((s) => s.records);
  if (records.length === 0) return null;

  const counted = records.filter(
    (r) => r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'EXCUSED'
  ).length;
  const pct = Math.round((counted / records.length) * 100);

  await prisma.subjectEnrollment.update({
    where: { subjectId_studentId: { subjectId, studentId } },
    data: { attendance: pct },
  });

  return pct;
}

export async function recalculateSubjectAttendanceForAllStudents(
  subjectId: string
): Promise<void> {
  const enrollments = await prisma.subjectEnrollment.findMany({
    where: { subjectId },
    select: { studentId: true },
  });
  await Promise.all(
    enrollments.map((e) => recalculateEnrollmentAttendance(subjectId, e.studentId))
  );
}

export async function syncAttendanceSessionToCalendars(sessionId: string): Promise<void> {
  const ready = await ensureStudentCalendarTables();
  if (!ready) return;

  const session = await prisma.subjectAttendanceSession.findUnique({
    where: { id: sessionId },
    include: {
      subject: {
        include: { teacher: { select: { userId: true } } },
      },
    },
  });
  if (!session) return;

  const ref = attendanceSessionSourceRef(session.id);
  const enrollments = await prisma.subjectEnrollment.findMany({
    where: { subjectId: session.subjectId },
    select: { studentId: true },
  });

  if (session.canceled) {
    await prisma.studentCalendarEvent.deleteMany({ where: { sourceRef: ref } }).catch(() => {});
    return;
  }

  const start = session.movedTo ?? session.date;
  const end = new Date(start.getTime() + 90 * 60 * 1000);
  const title = session.label
    ? `${session.subject.name} — ${session.label}`
    : `${session.subject.name} — Class`;
  const description = session.isOnline
    ? 'Online class (attendance tracked)'
    : 'Scheduled class — attendance tracked';

  const userIds = new Set(enrollments.map((e) => e.studentId));
  const teacherUserId = session.subject.teacher?.userId;
  if (teacherUserId) userIds.add(teacherUserId);

  for (const studentId of userIds) {
    const existing = await prisma.studentCalendarEvent.findFirst({
      where: { studentId, sourceRef: ref },
    });
    const payload = {
      title,
      description,
      category: 'ACADEMIC' as const,
      quickType: 'MEETING' as const,
      startAt: start,
      endAt: end,
      allDay: false,
      color: session.isOnline ? '#8b5cf6' : '#0ea5e9',
      professor: null,
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

export async function removeAttendanceSessionFromCalendars(sessionId: string): Promise<void> {
  const ref = attendanceSessionSourceRef(sessionId);
  await prisma.studentCalendarEvent.deleteMany({ where: { sourceRef: ref } }).catch(() => {});
}
