import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacherSubject } from '@/lib/teacher/subject-auth';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const auth = await requireTeacherSubject(subjectId);
  if (auth.error) return auth.error;

  const messages = await prisma.subjectMessage.findMany({
    where: { subjectId },
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

  const body = await request.json();
  const text = String(body.body || '').trim();
  const channel = body.channel ? String(body.channel) : 'class';
  if (!text) {
    return NextResponse.json({ error: 'Message required' }, { status: 400 });
  }

  const message = await prisma.subjectMessage.create({
    data: {
      subjectId,
      authorId: auth.session.user.id,
      channel,
      body: text,
    },
    include: { author: { select: { id: true, name: true, image: true } } },
  });

  return NextResponse.json({ message }, { status: 201 });
}
