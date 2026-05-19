import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUniversityApi } from '@/lib/university/api-auth';
import { logUniversityActivity } from '@/lib/university/activity';
import { syncStudentEnrollments } from '@/lib/academics/enrollments';

export async function POST(request: Request) {
  const auth = await requireUniversityApi();
  if (auth.error) return auth.error;

  const body = await request.json();
  const email = String(body.email || '').trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { studentProfile: true },
  });

  if (!user || user.role !== 'STUDENT') {
    return NextResponse.json(
      {
        error:
          'No student account found for this email. The student must register on UniBridge first.',
      },
      { status: 404 }
    );
  }

  const courseIdRaw = String(body.courseId || '').trim();
  if (!courseIdRaw) {
    return NextResponse.json(
      { error: 'Course is required so the student is enrolled in course subjects.' },
      { status: 400 }
    );
  }

  const course = await prisma.course.findFirst({
    where: {
      id: courseIdRaw,
      universityId: auth.ctx.university.id,
    },
  });
  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }
  const courseId = course.id;

  const yearOfStudy = body.yearOfStudy
    ? parseInt(String(body.yearOfStudy), 10)
    : undefined;
  const program = body.program ? String(body.program).trim() : undefined;

  const resolvedYear =
    yearOfStudy && !Number.isNaN(yearOfStudy) ? yearOfStudy : user.studentProfile?.yearOfStudy ?? null;

  const student = await prisma.studentProfile.upsert({
    where: { userId: user.id },
    update: {
      universityId: auth.ctx.university.id,
      universityName: auth.ctx.university.name,
      courseId: courseId ?? undefined,
      program: program ?? undefined,
      yearOfStudy: yearOfStudy && !Number.isNaN(yearOfStudy) ? yearOfStudy : undefined,
    },
    create: {
      userId: user.id,
      universityId: auth.ctx.university.id,
      universityName: auth.ctx.university.name,
      courseId,
      program: program ?? null,
      yearOfStudy: resolvedYear,
    },
  });

  await syncStudentEnrollments(user.id, {
    universityId: auth.ctx.university.id,
    courseId: student.courseId,
    yearOfStudy: student.yearOfStudy,
  });

  await logUniversityActivity(
    auth.ctx.university.id,
    'student',
    `Student linked: ${user.name || email}`,
    'A student was added to your university ecosystem.',
    '/university/academics?tab=students'
  );

  return NextResponse.json({ student }, { status: 201 });
}
