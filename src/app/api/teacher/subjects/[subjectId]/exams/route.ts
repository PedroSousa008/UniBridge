import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ensureExamTables } from '@/lib/db/ensure-exam-schema';
import { syncExamAnnouncement } from '@/lib/student/announcement-sync';
import { syncExamToCalendars } from '@/lib/student/exam-sync';
import { requireTeacherSubject } from '@/lib/teacher/subject-auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const auth = await requireTeacherSubject(subjectId);
  if (auth.error) return auth.error;

  await ensureExamTables();

  const body = await request.json();
  const title = String(body.title || '').trim();
  if (!title) {
    return NextResponse.json({ error: 'Title required' }, { status: 400 });
  }

  const startAt = body.startAt || body.date ? new Date(String(body.startAt || body.date)) : new Date();
  const endAt = body.endAt ? new Date(String(body.endAt)) : new Date(startAt.getTime() + 2 * 3600000);

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: { teacher: { include: { user: { select: { name: true } } } } },
  });

  const exam = await prisma.exam.create({
    data: {
      subjectId,
      createdById: auth.session.user.id,
      title,
      date: startAt,
      endAt,
      location: body.location || null,
      building: body.building || null,
      room: body.room || null,
      seatNumber: body.seatNumber || null,
      onlineUrl: body.onlineUrl || null,
      professor: body.professor || subject?.teacher?.user?.name || null,
      description: body.description || null,
      difficulty: body.difficulty ? parseInt(String(body.difficulty), 10) : 3,
      weight: body.weight ? parseFloat(String(body.weight)) : 1,
      contentVolume: body.contentVolume ? parseInt(String(body.contentVolume), 10) : 5,
      maxScore: body.maxScore ? parseFloat(String(body.maxScore)) : 100,
      classAverage: body.classAverage ? parseFloat(String(body.classAverage)) : null,
    },
  });

  await syncExamToCalendars(exam.id);
  await syncExamAnnouncement(exam.id);
  return NextResponse.json({ exam }, { status: 201 });
}
