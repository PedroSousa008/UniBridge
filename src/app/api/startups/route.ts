import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { MILESTONE_TEMPLATES } from '@/lib/startups/constants';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const industry = searchParams.get('industry');
  const stage = searchParams.get('stage');
  const universityId = searchParams.get('universityId');
  const lookingFor = searchParams.get('lookingFor');
  const sort = searchParams.get('sort') || 'newest';
  const hiring = searchParams.get('hiring') === 'true';

  const where: Record<string, unknown> = {};
  if (industry) where.industry = industry;
  if (stage) where.stage = stage;
  if (universityId) where.universityId = universityId;
  if (lookingFor) where.lookingFor = { has: lookingFor };
  if (hiring) where.openings = { some: {} };

  const orderBy =
    sort === 'readiness'
      ? { readinessScore: 'desc' as const }
      : sort === 'progress'
        ? { progressPercent: 'desc' as const }
        : { createdAt: 'desc' as const };

  const startups = await prisma.startup.findMany({
    where,
    orderBy,
    include: {
      founder: { select: { name: true, image: true } },
      members: {
        take: 4,
        include: { user: { select: { name: true, image: true } } },
      },
      openings: { take: 3 },
      milestones: true,
    },
    take: 50,
  });

  return NextResponse.json({ startups });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const name = String(body.name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { universityId: true, course: { select: { name: true } }, yearOfStudy: true },
  });

  const startup = await prisma.startup.create({
    data: {
      founderId: session.user.id,
      universityId: profile?.universityId ?? null,
      name,
      tagline: String(body.tagline || '').trim() || null,
      industry: String(body.industry || '').trim() || null,
      stage: String(body.stage || 'Idea').trim() || 'Idea',
    },
  });

  await prisma.startupMember.create({
    data: {
      startupId: startup.id,
      userId: session.user.id,
      role: 'CEO',
      isMainFounder: true,
      course: profile?.course?.name ?? null,
      yearOfStudy: profile?.yearOfStudy ?? null,
    },
  });

  await prisma.startupMilestone.createMany({
    data: MILESTONE_TEMPLATES.map((m, i) => ({
      startupId: startup.id,
      key: m.key,
      label: m.label,
      status: m.key === 'idea_defined' ? 'completed' : 'pending',
      sortOrder: i,
    })),
    skipDuplicates: true,
  });

  return NextResponse.json({ startup }, { status: 201 });
}
