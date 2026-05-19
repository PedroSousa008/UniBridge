import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ensureAttendanceTables } from '@/lib/db/ensure-attendance-schema';
import { syncAttendanceAnnouncement } from '@/lib/student/announcement-sync';
import {
  recalculateSubjectAttendanceForAllStudents,
  syncAttendanceSessionToCalendars,
} from '@/lib/student/attendance-sync';
import { requireTeacherSubject } from '@/lib/teacher/subject-auth';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const auth = await requireTeacherSubject(subjectId);
  if (auth.error) return auth.error;

  await ensureAttendanceTables();

  const sessions = await prisma.subjectAttendanceSession.findMany({
    where: { subjectId },
    include: {
      records: {
        include: { student: { select: { id: true, name: true, email: true } } },
      },
    },
    orderBy: { date: 'desc' },
    take: 80,
  });

  const justifications = await prisma.attendanceJustification.findMany({
    where: { subjectId, status: 'PENDING' },
    include: {
      student: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ sessions, pendingJustifications: justifications });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const auth = await requireTeacherSubject(subjectId);
  if (auth.error) return auth.error;

  await ensureAttendanceTables();

  const body = await request.json();
  const date = body.date ? new Date(String(body.date)) : new Date();
  const label = body.label ? String(body.label) : null;

  const session = await prisma.subjectAttendanceSession.create({
    data: {
      subjectId,
      date,
      label,
      canceled: !!body.canceled,
      isOnline: !!body.isOnline,
      movedTo: body.movedTo ? new Date(String(body.movedTo)) : null,
      scheduleSlotId: body.scheduleSlotId ? String(body.scheduleSlotId) : null,
    },
  });

  const records = Array.isArray(body.records)
    ? (body.records as { studentId: string; status: string }[])
    : [];

  for (const r of records) {
    const status = ['PRESENT', 'ABSENT', 'EXCUSED', 'LATE'].includes(r.status)
      ? r.status
      : 'ABSENT';
    await prisma.subjectAttendanceRecord.upsert({
      where: {
        sessionId_studentId: { sessionId: session.id, studentId: r.studentId },
      },
      create: {
        sessionId: session.id,
        studentId: r.studentId,
        status: status as 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE',
      },
      update: { status: status as 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE' },
    });
  }

  await recalculateSubjectAttendanceForAllStudents(subjectId);
  await syncAttendanceSessionToCalendars(session.id);
  await syncAttendanceAnnouncement(session.id);

  const full = await prisma.subjectAttendanceSession.findUnique({
    where: { id: session.id },
    include: { records: true },
  });

  return NextResponse.json({ session: full });
}
