import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { saveStartupFull } from '@/lib/startups/save-startup';
import type { StartupPayload } from '@/lib/startups/readiness';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const startup = await prisma.startup.findUnique({
    where: { id },
    include: {
      founder: { select: { id: true, name: true, email: true, image: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      },
      media: { orderBy: { sortOrder: 'asc' } },
      milestones: { orderBy: { sortOrder: 'asc' } },
      tractionMetrics: true,
      openings: true,
      _count: { select: { followers: true, interests: true } },
    },
  });

  if (!startup) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const isMember =
    startup.founderId === session.user.id ||
    startup.members.some((m) => m.userId === session.user.id);

  return NextResponse.json({ startup, isMember, canEdit: startup.founderId === session.user.id });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as StartupPayload;

  const updated = await saveStartupFull(id, session.user.id, body);
  if (!updated) {
    return NextResponse.json({ error: 'Startup not found' }, { status: 404 });
  }

  return NextResponse.json({ startup: updated });
}
