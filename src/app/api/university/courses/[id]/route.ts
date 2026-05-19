import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUniversityApi } from '@/lib/university/api-auth';
import { logUniversityActivity } from '@/lib/university/activity';

async function getOwnedCourse(universityId: string, id: string) {
  return prisma.course.findFirst({
    where: { id, universityId },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUniversityApi();
  if (auth.error) return auth.error;

  const { id } = await params;
  const course = await getOwnedCourse(auth.ctx.university.id, id);
  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }

  const body = await request.json();
  const name = body.name !== undefined ? String(body.name).trim() : course.name;
  if (!name) {
    return NextResponse.json({ error: 'Course name required' }, { status: 400 });
  }

  const updated = await prisma.course.update({
    where: { id },
    data: {
      name,
      department: body.department !== undefined ? body.department || null : undefined,
      duration: body.duration !== undefined ? body.duration || null : undefined,
      degreeType: body.degreeType !== undefined ? body.degreeType || null : undefined,
      description: body.description !== undefined ? body.description || null : undefined,
      status: body.status !== undefined ? body.status : undefined,
    },
  });

  await logUniversityActivity(
    auth.ctx.university.id,
    'course',
    `Course updated: ${name}`,
    undefined,
    '/university/academics?tab=courses'
  );

  return NextResponse.json({ course: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUniversityApi();
  if (auth.error) return auth.error;

  const { id } = await params;
  const course = await getOwnedCourse(auth.ctx.university.id, id);
  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.subject.deleteMany({ where: { courseId: id } }),
    prisma.studentProfile.updateMany({
      where: { courseId: id },
      data: { courseId: null },
    }),
    prisma.course.delete({ where: { id } }),
  ]);

  await logUniversityActivity(
    auth.ctx.university.id,
    'course',
    `Course removed: ${course.name}`,
    'Course and its subjects were deleted. Students were unassigned from this course.',
    '/university/academics?tab=courses'
  );

  return NextResponse.json({ ok: true });
}
