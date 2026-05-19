import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

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

  const startup = await prisma.startup.create({
    data: {
      founderId: session.user.id,
      name,
      tagline: String(body.tagline || '').trim() || null,
      industry: String(body.industry || '').trim() || null,
      stage: String(body.stage || '').trim() || null,
    },
  });

  await prisma.startupMember.create({
    data: {
      startupId: startup.id,
      userId: session.user.id,
      role: 'Founder',
    },
  });

  return NextResponse.json({ startup }, { status: 201 });
}
