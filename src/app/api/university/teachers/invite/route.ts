import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUniversityApi } from '@/lib/university/api-auth';
import { logUniversityActivity } from '@/lib/university/activity';

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
    include: { teacherProfile: true },
  });

  if (!user || user.role !== 'TEACHER') {
    return NextResponse.json(
      { error: 'No teacher account found for this email.' },
      { status: 404 }
    );
  }

  const teacher = await prisma.teacherProfile.upsert({
    where: { userId: user.id },
    update: {
      universityId: auth.ctx.university.id,
      department: body.department || undefined,
      title: body.title || undefined,
      status: 'ACTIVE',
    },
    create: {
      userId: user.id,
      universityId: auth.ctx.university.id,
      department: body.department || null,
      title: body.title || null,
      status: 'ACTIVE',
    },
  });

  await logUniversityActivity(
    auth.ctx.university.id,
    'teacher',
    `Teacher linked: ${user.name || email}`,
    'A teacher was invited to your university ecosystem.',
    '/university/academics?tab=teachers'
  );

  return NextResponse.json({ teacher }, { status: 201 });
}
