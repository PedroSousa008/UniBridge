import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: startupId } = await params;

  await prisma.startupBookmark.upsert({
    where: { startupId_userId: { startupId, userId: session.user.id } },
    create: { startupId, userId: session.user.id },
    update: {},
  });

  return NextResponse.json({ ok: true });
}
