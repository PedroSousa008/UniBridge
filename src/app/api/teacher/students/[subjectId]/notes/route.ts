import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacherSubject } from '@/lib/teacher/subject-auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const auth = await requireTeacherSubject(subjectId);
  if (auth.error) return auth.error;

  const studentId = new URL(request.url).searchParams.get('studentId');
  if (!studentId) {
    const notes = await prisma.teacherAttendanceNote.findMany({
      where: { subjectId },
      select: { studentId: true, note: true, updatedAt: true },
    });
    return NextResponse.json({ notes });
  }

  const note = await prisma.teacherAttendanceNote.findUnique({
    where: { subjectId_studentId: { subjectId, studentId } },
  });
  return NextResponse.json({ note: note?.note ?? null });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const auth = await requireTeacherSubject(subjectId);
  if (auth.error) return auth.error;

  const body = await request.json();
  const studentId = String(body.studentId || '').trim();
  const note = String(body.note ?? '').trim();
  if (!studentId) {
    return NextResponse.json({ error: 'Student required' }, { status: 400 });
  }

  const enrollment = await prisma.subjectEnrollment.findUnique({
    where: { subjectId_studentId: { subjectId, studentId } },
  });
  if (!enrollment) {
    return NextResponse.json({ error: 'Student not enrolled' }, { status: 404 });
  }

  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId: auth.session.user.id },
  });
  if (!teacher) {
    return NextResponse.json({ error: 'Teacher profile required' }, { status: 403 });
  }

  if (!note) {
    await prisma.teacherAttendanceNote.deleteMany({
      where: { subjectId, studentId },
    });
    return NextResponse.json({ note: null });
  }

  const row = await prisma.teacherAttendanceNote.upsert({
    where: { subjectId_studentId: { subjectId, studentId } },
    create: { subjectId, studentId, teacherId: teacher.id, note },
    update: { note, teacherId: teacher.id },
  });

  return NextResponse.json({ note: row.note });
}
