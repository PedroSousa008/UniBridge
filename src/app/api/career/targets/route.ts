import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const targets = await prisma.careerTarget.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json({ targets });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const roleTitle = String(body.roleTitle || '').trim();
  const companyName = String(body.companyName || '').trim() || null;

  if (!roleTitle) {
    return NextResponse.json({ error: 'Role title is required' }, { status: 400 });
  }

  const count = await prisma.careerTarget.count({
    where: { userId: session.user.id },
  });

  const target = await prisma.careerTarget.create({
    data: {
      userId: session.user.id,
      roleTitle,
      companyName,
      compatibility: 0,
      isPrimary: count === 0,
    },
  });

  return NextResponse.json({ target }, { status: 201 });
}
