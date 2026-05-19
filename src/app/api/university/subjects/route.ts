import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUniversityApi } from '@/lib/university/api-auth';
import { logUniversityActivity } from '@/lib/university/activity';

export async function POST(request: Request) {
  const auth = await requireUniversityApi();
  if (auth.error) return auth.error;

  const body = await request.json();
  const name = String(body.name || '').trim();
  const courseId = String(body.courseId || '').trim();

  if (!name) {
    return NextResponse.json({ error: 'Subject name is required' }, { status: 400 });
  }
  if (!courseId) {
    return NextResponse.json({ error: 'Course is required' }, { status: 400 });
  }

  const course = await prisma.course.findFirst({
    where: { id: courseId, universityId: auth.ctx.university.id },
  });

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }

  let teacherId: string | null = null;
  if (body.teacherId) {
    const teacher = await prisma.teacherProfile.findFirst({
      where: {
        id: String(body.teacherId),
        universityId: auth.ctx.university.id,
      },
    });
    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found at your university' }, { status: 404 });
    }
    teacherId = teacher.id;
  }

  const year = body.year ? parseInt(String(body.year), 10) : null;
  const semester = body.semester ? String(body.semester).trim() : null;

  const subject = await prisma.subject.create({
    data: {
      universityId: auth.ctx.university.id,
      courseId,
      name,
      code: body.code ? String(body.code).trim() : null,
      year: Number.isNaN(year) ? null : year,
      semester,
      teacherId,
      status: 'ACTIVE',
    },
  });

  await logUniversityActivity(
    auth.ctx.university.id,
    'subject',
    `Subject added: ${name}`,
    `Linked to course ${course.name}.`,
    '/university/academics?tab=subjects'
  );

  return NextResponse.json({ subject }, { status: 201 });
}
