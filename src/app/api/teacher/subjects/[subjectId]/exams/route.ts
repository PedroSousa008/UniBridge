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
  if (!title) {
    return NextResponse.json({ error: 'Title required' }, { status: 400 });
  }

  const exam = await prisma.exam.create({
    data: {
      subjectId,
      title,
      date: body.date ? new Date(String(body.date)) : new Date(),
      location: body.location || null,
      maxScore: body.maxScore ? parseFloat(String(body.maxScore)) : 100,
    },
  });

  return NextResponse.json({ exam }, { status: 201 });
}
