import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUniversityApi } from '@/lib/university/api-auth';
import { logUniversityActivity } from '@/lib/university/activity';

export async function GET() {
  const auth = await requireUniversityApi();
  if (auth.error) return auth.error;

  const courses = await prisma.course.findMany({
    where: { universityId: auth.ctx.university.id },
    include: {
      coordinator: { include: { user: { select: { name: true } } } },
      _count: { select: { students: true, subjects: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json({ courses });
}

export async function POST(request: Request) {
  const auth = await requireUniversityApi();
  if (auth.error) return auth.error;

  const body = await request.json();
  const name = String(body.name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'Course name required' }, { status: 400 });
  }

  const course = await prisma.course.create({
    data: {
      universityId: auth.ctx.university.id,
      name,
      department: body.department || null,
      duration: body.duration || null,
      degreeType: body.degreeType || null,
      description: body.description || null,
    },
  });

  await logUniversityActivity(
    auth.ctx.university.id,
    'course',
    `New course: ${name}`,
    'A course was added to the academic structure.',
    '/university/academics?tab=courses'
  );

  return NextResponse.json({ course }, { status: 201 });
}
