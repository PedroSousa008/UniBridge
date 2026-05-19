import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

async function assertEnrollment(userId: string, subjectId: string) {
  return prisma.subjectEnrollment.findUnique({
    where: { subjectId_studentId: { subjectId, studentId: userId } },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { subjectId } = await params;
  const enrollment = await assertEnrollment(session.user.id, subjectId);
  if (!enrollment) {
    return NextResponse.json({ error: 'Not enrolled' }, { status: 403 });
  }

  const body = await request.json();
  const text = String(body.body || '').trim();
  if (!text) {
    return NextResponse.json({ error: 'Message required' }, { status: 400 });
  }

  const message = await prisma.subjectMessage.create({
    data: {
      subjectId,
      authorId: session.user.id,
      channel: 'class',
      body: text,
    },
    include: { author: { select: { id: true, name: true, image: true } } },
  });

  return NextResponse.json({ message }, { status: 201 });
}
