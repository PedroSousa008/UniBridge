import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: startupId } = await params;
  const body = await request.json();
  const type = String(body.type || 'join');
  const message = body.message ? String(body.message) : null;

  const startup = await prisma.startup.findUnique({ where: { id: startupId } });
  if (!startup) {
    return NextResponse.json({ error: 'Startup not found' }, { status: 404 });
  }

  if (startup.founderId === session.user.id) {
    return NextResponse.json({ error: 'Cannot apply to your own startup' }, { status: 400 });
  }

  const interest = await prisma.startupInterest.upsert({
    where: {
      startupId_userId_type: { startupId, userId: session.user.id, type },
    },
    create: { startupId, userId: session.user.id, type, message, status: 'pending' },
    update: { message, status: 'pending' },
  });

  return NextResponse.json({ interest }, { status: 201 });
}
