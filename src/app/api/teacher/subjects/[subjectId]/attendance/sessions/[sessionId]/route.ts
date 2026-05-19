import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ensureAttendanceTables } from '@/lib/db/ensure-attendance-schema';
import { syncAttendanceAnnouncement } from '@/lib/student/announcement-sync';
import {
  recalculateSubjectAttendanceForAllStudents,
  removeAttendanceSessionFromCalendars,
  syncAttendanceSessionToCalendars,
} from '@/lib/student/attendance-sync';
import { requireTeacherSubject } from '@/lib/teacher/subject-auth';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; sessionId: string }> }
) {
  const { subjectId, sessionId } = await params;
  const auth = await requireTeacherSubject(subjectId);
  if (auth.error) return auth.error;

  await ensureAttendanceTables();

  const existing = await prisma.subjectAttendanceSession.findFirst({
    where: { id: sessionId, subjectId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const body = await request.json();

  const session = await prisma.subjectAttendanceSession.update({
    where: { id: sessionId },
    data: {
      date: body.date ? new Date(String(body.date)) : undefined,
      label: body.label !== undefined ? (body.label ? String(body.label) : null) : undefined,
      canceled: body.canceled !== undefined ? !!body.canceled : undefined,
      isOnline: body.isOnline !== undefined ? !!body.isOnline : undefined,
      movedTo:
        body.movedTo !== undefined
          ? body.movedTo
            ? new Date(String(body.movedTo))
            : null
          : undefined,
    },
  });

  if (Array.isArray(body.records)) {
    for (const r of body.records as { studentId: string; status: string }[]) {
      const status = ['PRESENT', 'ABSENT', 'EXCUSED', 'LATE'].includes(r.status)
        ? r.status
        : 'ABSENT';
      await prisma.subjectAttendanceRecord.upsert({
        where: {
          sessionId_studentId: { sessionId, studentId: r.studentId },
        },
        create: {
          sessionId,
          studentId: r.studentId,
          status: status as 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE',
        },
        update: { status: status as 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE' },
      });
    }
  }

  await recalculateSubjectAttendanceForAllStudents(subjectId);

  if (session.canceled) {
    await removeAttendanceSessionFromCalendars(sessionId);
  } else {
    await syncAttendanceSessionToCalendars(sessionId);
  }
  await syncAttendanceAnnouncement(sessionId);

  const full = await prisma.subjectAttendanceSession.findUnique({
    where: { id: sessionId },
    include: { records: true },
  });

  return NextResponse.json({ session: full });
}
