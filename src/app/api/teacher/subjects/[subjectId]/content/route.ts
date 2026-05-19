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
  const weekNumber = parseInt(String(body.weekNumber || '1'), 10);
  const weekTitle = String(body.weekTitle || `Week ${weekNumber}`).trim();
  const itemTitle = String(body.itemTitle || '').trim();

  const week = await prisma.subjectContentWeek.upsert({
    where: { subjectId_weekNumber: { subjectId, weekNumber } },
    create: { subjectId, weekNumber, title: weekTitle },
    update: { title: weekTitle },
  });

  if (!itemTitle) {
    return NextResponse.json({ week });
  }

  const item = await prisma.subjectContentItem.create({
    data: {
      weekId: week.id,
      title: itemTitle,
      type: body.type || 'PDF',
      url: body.url || null,
      fileUrl: body.fileUrl || null,
      description: body.description || null,
      examPriority: !!body.examPriority,
    },
  });

  return NextResponse.json({ week, item }, { status: 201 });
}
