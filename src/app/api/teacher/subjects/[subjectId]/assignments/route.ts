import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacherSubject } from '@/lib/teacher/subject-auth';
import { enrollCourseStudentsInSubject } from '@/lib/academics/enrollments';

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

  const dueDate = body.dueDate ? new Date(String(body.dueDate)) : new Date();
  const assignment = await prisma.assignment.create({
    data: {
      subjectId,
      title,
      description: body.description || null,
      dueDate,
      maxScore: body.maxScore ? parseFloat(String(body.maxScore)) : 100,
      gradeCategoryId: body.gradeCategoryId || null,
    },
  });

  if (auth.subject.courseId) {
    await enrollCourseStudentsInSubject(
      subjectId,
      auth.subject.courseId,
      auth.subject.year
    );
  }

  return NextResponse.json({ assignment }, { status: 201 });
}
