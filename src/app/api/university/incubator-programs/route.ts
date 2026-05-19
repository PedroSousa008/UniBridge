import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUniversityApi } from '@/lib/university/api-auth';
import { logUniversityActivity } from '@/lib/university/activity';

export async function POST(request: Request) {
  const auth = await requireUniversityApi();
  if (auth.error) return auth.error;

  const body = await request.json();
  const title = String(body.title || '').trim();
  if (!title) {
    return NextResponse.json({ error: 'Program title is required' }, { status: 400 });
  }

  const program = await prisma.incubatorProgram.create({
    data: {
      universityId: auth.ctx.university.id,
      title,
      description: body.description || null,
      eligibility: body.eligibility || null,
      location: body.location || null,
      mentors: [],
      companies: [],
      status: 'ACTIVE',
    },
  });

  await logUniversityActivity(
    auth.ctx.university.id,
    'incubator',
    `Incubator program: ${title}`,
    'A new incubator program was created.',
    '/university/innovation?tab=incubator'
  );

  return NextResponse.json({ program }, { status: 201 });
}
