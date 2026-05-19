import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { subjectId } = await params;
  const enrollment = await prisma.subjectEnrollment.findUnique({
    where: { subjectId_studentId: { subjectId, studentId: session.user.id } },
  });
  if (!enrollment) {
    return NextResponse.json({ error: 'Not enrolled' }, { status: 403 });
  }

  const body = await request.json();
  const itemId = String(body.itemId || '');
  const note = body.note != null ? String(body.note) : '';

  const item = await prisma.subjectContentItem.findFirst({
    where: { id: itemId, week: { subjectId } },
  });
  if (!item) {
    return NextResponse.json({ error: 'Content not found' }, { status: 404 });
  }

  await prisma.subjectContentNote.upsert({
    where: { itemId_studentId: { itemId, studentId: session.user.id } },
    create: { itemId, studentId: session.user.id, note },
    update: { note },
  });

  return NextResponse.json({ ok: true });
}
