import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUniversityApi } from '@/lib/university/api-auth';
import { logUniversityActivity } from '@/lib/university/activity';
import {
  clearStudentEnrollmentsForUniversity,
  setStudentSubjectEnrollments,
} from '@/lib/academics/enrollments';

async function getOwnedStudent(universityId: string, id: string) {
  return prisma.studentProfile.findFirst({
    where: { id, universityId },
    include: { user: { select: { name: true, email: true } } },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUniversityApi();
  if (auth.error) return auth.error;

  const { id } = await params;
  const student = await getOwnedStudent(auth.ctx.university.id, id);
  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  const body = await request.json();

  let courseId: string | null | undefined = undefined;
  if (body.courseId !== undefined) {
    const raw = String(body.courseId).trim();
    if (!raw) {
      courseId = null;
    } else {
      const course = await prisma.course.findFirst({
        where: { id: raw, universityId: auth.ctx.university.id },
      });
      if (!course) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }
      courseId = course.id;
    }
  }

  const yearOfStudy =
    body.yearOfStudy !== undefined
      ? body.yearOfStudy
        ? parseInt(String(body.yearOfStudy), 10)
        : null
      : undefined;

  const updated = await prisma.studentProfile.update({
    where: { id },
    data: {
      program:
        body.program !== undefined
          ? body.program
            ? String(body.program).trim()
            : null
          : undefined,
      yearOfStudy:
        yearOfStudy !== undefined
          ? yearOfStudy && !Number.isNaN(yearOfStudy)
            ? yearOfStudy
            : null
          : undefined,
      courseId,
    },
  });

  if (Array.isArray(body.subjectIds)) {
    await setStudentSubjectEnrollments(
      student.userId,
      auth.ctx.university.id,
      body.subjectIds.map((sid: unknown) => String(sid))
    );
  }

  await logUniversityActivity(
    auth.ctx.university.id,
    'student',
    `Student updated: ${student.user.name || student.user.email}`,
    undefined,
    '/university/academics?tab=students'
  );

  return NextResponse.json({ student: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUniversityApi();
  if (auth.error) return auth.error;

  const { id } = await params;
  const student = await getOwnedStudent(auth.ctx.university.id, id);
  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  await clearStudentEnrollmentsForUniversity(student.userId, auth.ctx.university.id);

  await prisma.studentProfile.update({
    where: { id },
    data: {
      universityId: null,
      universityName: null,
      courseId: null,
      program: null,
      yearOfStudy: null,
    },
  });

  await logUniversityActivity(
    auth.ctx.university.id,
    'student',
    `Student unlinked: ${student.user.name || student.user.email}`,
    'The student account remains on UniBridge but is no longer linked to your university.',
    '/university/academics?tab=students'
  );

  return NextResponse.json({ ok: true });
}
