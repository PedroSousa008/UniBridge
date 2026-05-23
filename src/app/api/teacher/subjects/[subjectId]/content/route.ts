import { ContentItemType } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { syncDocumentAnnouncement } from '@/lib/student/announcement-sync';
import { requireTeacherSubject } from '@/lib/teacher/subject-auth';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const auth = await requireTeacherSubject(subjectId);
  if (auth.error) return auth.error;

  const weeks = await prisma.subjectContentWeek.findMany({
    where: { subjectId },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { weekNumber: 'asc' },
  });

  return NextResponse.json({ weeks });
}

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
      type:
        body.type &&
        (Object.values(ContentItemType) as string[]).includes(String(body.type).toUpperCase())
          ? (String(body.type).toUpperCase() as ContentItemType)
          : ContentItemType.PDF,
      url: body.url || null,
      fileUrl: body.fileUrl || null,
      description: body.description || null,
      examPriority: !!body.examPriority,
    },
  });

  await syncDocumentAnnouncement(item.id);

  return NextResponse.json({ week, item }, { status: 201 });
}
