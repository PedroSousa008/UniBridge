import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ensureAttendanceTables } from '@/lib/db/ensure-attendance-schema';
import { requireTeacherSubject } from '@/lib/teacher/subject-auth';

/** Private teacher notes per student — not visible to other students. */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const auth = await requireTeacherSubject(subjectId);
  if (auth.error) return auth.error;

  await ensureAttendanceTables();

  const body = await request.json();
  const studentId = String(body.studentId || '').trim();
  const note = String(body.note || '').trim();
  if (!studentId || !note) {
    return NextResponse.json({ error: 'Student and note required' }, { status: 400 });
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

  const row = await prisma.teacherAttendanceNote.upsert({
    where: { subjectId_studentId: { subjectId, studentId } },
    create: { subjectId, studentId, teacherId: teacher.id, note },
    update: { note, teacherId: teacher.id },
  });

  return NextResponse.json({ note: row });
}
