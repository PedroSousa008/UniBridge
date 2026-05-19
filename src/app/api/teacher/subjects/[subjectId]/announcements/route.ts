import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacherSubject } from '@/lib/teacher/subject-auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const auth = await requireTeacherSubject(subjectId);
  if (auth.error) return auth.error;

  const body = await request.json();
  const title = String(body.title || '').trim();
  const text = String(body.body || '').trim();
  if (!title || !text) {
    return NextResponse.json({ error: 'Title and body required' }, { status: 400 });
  }

  const announcement = await prisma.subjectAnnouncement.create({
    data: {
      subjectId,
      authorId: auth.session.user.id,
      title,
      body: text,
      priority: body.priority === 'high' ? 'high' : 'normal',
      pinned: !!body.pinned,
      publishedAt: new Date(),
    },
  });

  return NextResponse.json({ announcement }, { status: 201 });
}
