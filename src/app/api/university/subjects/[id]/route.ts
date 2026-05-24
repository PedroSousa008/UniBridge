import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isValidSubjectSemester } from '@/lib/academics/subject-semester';
import { requireUniversityApi } from '@/lib/university/api-auth';
import { logUniversityActivity } from '@/lib/university/activity';
import {
  enrollCourseStudentsInSubject,
  syncAllStudentsInCourse,
} from '@/lib/academics/enrollments';

async function getOwnedSubject(universityId: string, id: string) {
  return prisma.subject.findFirst({
    where: {
      id,
      OR: [{ universityId }, { course: { universityId } }],
    },
    include: { course: { select: { name: true } } },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUniversityApi();
  if (auth.error) return auth.error;

  const { id } = await params;
  const subject = await getOwnedSubject(auth.ctx.university.id, id);
  if (!subject) {
    return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
  }

  const body = await request.json();
  const name = body.name !== undefined ? String(body.name).trim() : subject.name;
  if (!name) {
    return NextResponse.json({ error: 'Subject name is required' }, { status: 400 });
  }

  let courseId = subject.courseId;
  if (body.courseId !== undefined) {
    const nextCourseId = String(body.courseId).trim();
    if (!nextCourseId) {
      return NextResponse.json({ error: 'Course is required' }, { status: 400 });
    }
    const course = await prisma.course.findFirst({
      where: { id: nextCourseId, universityId: auth.ctx.university.id },
    });
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    courseId = nextCourseId;
  }

  let teacherId: string | null = subject.teacherId;
  if (body.teacherId !== undefined) {
    const raw = String(body.teacherId).trim();
    if (!raw) {
      teacherId = null;
    } else {
      const teacher = await prisma.teacherProfile.findFirst({
        where: { id: raw, universityId: auth.ctx.university.id },
      });
      if (!teacher) {
        return NextResponse.json({ error: 'Teacher not found at your university' }, { status: 404 });
      }
      teacherId = teacher.id;
    }
  }

  const year =
    body.year !== undefined
      ? body.year
        ? parseInt(String(body.year), 10)
        : null
      : undefined;
  const semester =
    body.semester !== undefined
      ? body.semester
        ? (() => {
            const raw = String(body.semester).trim();
            if (!isValidSubjectSemester(raw)) {
              return 'INVALID' as const;
            }
            return raw;
          })()
        : null
      : undefined;
  if (semester === 'INVALID') {
    return NextResponse.json({ error: 'Semester must be 1st or 2nd' }, { status: 400 });
  }

  const courseChanged = courseId !== subject.courseId;
  const yearChanged = year !== undefined && year !== subject.year;

  const updated = await prisma.subject.update({
    where: { id },
    data: {
      name,
      courseId: courseId ?? undefined,
      code: body.code !== undefined ? (body.code ? String(body.code).trim() : null) : undefined,
      year: year !== undefined ? (Number.isNaN(year as number) ? null : year) : undefined,
      semester,
      teacherId: body.teacherId !== undefined ? teacherId : undefined,
      status: body.status !== undefined ? body.status : undefined,
    },
  });

  if (updated.courseId && (courseChanged || yearChanged)) {
    if (subject.courseId && subject.courseId !== updated.courseId) {
      await syncAllStudentsInCourse(subject.courseId);
    }
    await enrollCourseStudentsInSubject(updated.id, updated.courseId, updated.year);
    await syncAllStudentsInCourse(updated.courseId);
  }

  await logUniversityActivity(
    auth.ctx.university.id,
    'subject',
    `Subject updated: ${name}`,
    undefined,
    '/university/academics?tab=subjects'
  );

  return NextResponse.json({ subject: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUniversityApi();
  if (auth.error) return auth.error;

  const { id } = await params;
  const subject = await getOwnedSubject(auth.ctx.university.id, id);
  if (!subject) {
    return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
  }

  await prisma.subject.delete({ where: { id } });

  await logUniversityActivity(
    auth.ctx.university.id,
    'subject',
    `Subject removed: ${subject.name}`,
    subject.course ? `Was linked to ${subject.course.name}.` : undefined,
    '/university/academics?tab=subjects'
  );

  return NextResponse.json({ ok: true });
}
