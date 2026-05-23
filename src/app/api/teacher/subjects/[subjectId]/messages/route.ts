import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ensureTeacherStudentsSchema } from '@/lib/db/ensure-teacher-students-schema';
import { requireTeacherSubject } from '@/lib/teacher/subject-auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const auth = await requireTeacherSubject(subjectId);
  if (auth.error) return auth.error;
  await ensureTeacherStudentsSchema();

  const url = new URL(request.url);
  const studentId = url.searchParams.get('studentId');
  const channel = url.searchParams.get('channel');

  const where: { subjectId: string; channel?: string; recipientId?: string } = { subjectId };
  if (channel === 'direct' && studentId) {
    where.channel = 'direct';
    where.recipientId = studentId;
  } else if (channel === 'class') {
    where.channel = 'class';
  }

  const messages = await prisma.subjectMessage.findMany({
    where,
    include: { author: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });

  return NextResponse.json({ messages });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const auth = await requireTeacherSubject(subjectId);
  if (auth.error) return auth.error;
  await ensureTeacherStudentsSchema();

  const body = await request.json();
  const text = String(body.body || '').trim();
  const channel = body.channel ? String(body.channel) : 'class';
  const recipientId = body.recipientId ? String(body.recipientId) : null;
  if (!text) {
    return NextResponse.json({ error: 'Message required' }, { status: 400 });
  }

  if (channel === 'direct' && recipientId) {
    const enrollment = await prisma.subjectEnrollment.findUnique({
      where: { subjectId_studentId: { subjectId, studentId: recipientId } },
    });
    if (!enrollment) {
      return NextResponse.json({ error: 'Student not enrolled' }, { status: 404 });
    }
  }

  const message = await prisma.subjectMessage.create({
    data: {
      subjectId,
      authorId: auth.session.user.id,
      channel,
      body: text,
      recipientId: channel === 'direct' ? recipientId : null,
    },
    include: { author: { select: { id: true, name: true, image: true } } },
  });

  return NextResponse.json({ message }, { status: 201 });
}
