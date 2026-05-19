import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ensureAttendanceTables } from '@/lib/db/ensure-attendance-schema';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ready = await ensureAttendanceTables();
  if (!ready) {
    return NextResponse.json({ error: 'ATTENDANCE_DB_NOT_READY' }, { status: 503 });
  }

  const body = await request.json();
  const subjectId = String(body.subjectId || '').trim();
  const reason = String(body.reason || '').trim();
  if (!subjectId || !reason) {
    return NextResponse.json({ error: 'Subject and explanation required' }, { status: 400 });
  }

  const enrollment = await prisma.subjectEnrollment.findUnique({
    where: { subjectId_studentId: { subjectId, studentId: session.user.id } },
  });
  if (!enrollment) {
    return NextResponse.json({ error: 'Not enrolled in subject' }, { status: 403 });
  }

  const sessionId = body.sessionId ? String(body.sessionId) : null;
  if (sessionId) {
    const sess = await prisma.subjectAttendanceSession.findFirst({
      where: { id: sessionId, subjectId },
    });
    if (!sess) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
  }

  const row = await prisma.attendanceJustification.create({
    data: {
      studentId: session.user.id,
      subjectId,
      sessionId,
      reason,
      fileUrl: body.fileUrl ? String(body.fileUrl) : null,
      documentUrl: body.documentUrl ? String(body.documentUrl) : null,
    },
    include: { subject: { select: { name: true } } },
  });

  return NextResponse.json({
    justification: {
      id: row.id,
      subjectId: row.subjectId,
      subjectName: row.subject.name,
      sessionId: row.sessionId,
      reason: row.reason,
      fileUrl: row.fileUrl,
      documentUrl: row.documentUrl,
      status: row.status,
      teacherNote: row.teacherNote,
      createdAt: row.createdAt.toISOString(),
      reviewedAt: null,
    },
  });
}

/** Teacher review endpoint — used by future teacher attendance UI. */
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ready = await ensureAttendanceTables();
  if (!ready) {
    return NextResponse.json({ error: 'ATTENDANCE_DB_NOT_READY' }, { status: 503 });
  }

  const body = await request.json();
  const id = String(body.id || '').trim();
  const status = body.status as 'APPROVED' | 'REJECTED';
  if (!id || !['APPROVED', 'REJECTED'].includes(status)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const existing = await prisma.attendanceJustification.findUnique({
    where: { id },
    include: { subject: { select: { teacherId: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!teacher || existing.subject.teacherId !== teacher.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const updated = await prisma.attendanceJustification.update({
    where: { id },
    data: {
      status,
      teacherNote: body.teacherNote ? String(body.teacherNote) : null,
      reviewedById: session.user.id,
      reviewedAt: new Date(),
    },
  });

  if (status === 'APPROVED' && existing.sessionId) {
    await prisma.subjectAttendanceRecord.upsert({
      where: {
        sessionId_studentId: {
          sessionId: existing.sessionId,
          studentId: existing.studentId,
        },
      },
      create: {
        sessionId: existing.sessionId,
        studentId: existing.studentId,
        status: 'EXCUSED',
      },
      update: { status: 'EXCUSED' },
    });
    const { recalculateEnrollmentAttendance } = await import(
      '@/lib/student/attendance-sync'
    );
    await recalculateEnrollmentAttendance(existing.subjectId, existing.studentId);
  }

  return NextResponse.json({ justification: updated });
}
