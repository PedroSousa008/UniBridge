import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ensureExamTables } from '@/lib/db/ensure-exam-schema';
import { syncExamAnnouncement } from '@/lib/student/announcement-sync';
import { syncExamToCalendars } from '@/lib/student/exam-sync';
import { loadStudentExamsHub } from '@/lib/student/student-exams';
import { isPrismaSchemaMismatchError } from '@/lib/prisma-errors';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ready = await ensureExamTables();
  if (!ready) {
    return NextResponse.json({ error: 'Exams storage not ready', code: 'EXAMS_DB_NOT_READY' }, { status: 503 });
  }

  const exams = await loadStudentExamsHub(session.user.id);
  return NextResponse.json({ exams });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ready = await ensureExamTables();
  if (!ready) {
    return NextResponse.json({ error: 'Exams storage not ready', code: 'EXAMS_DB_NOT_READY' }, { status: 503 });
  }

  const body = await request.json();
  const title = String(body.title || '').trim();
  if (!title) {
    return NextResponse.json({ error: 'Title required' }, { status: 400 });
  }

  const startAt = body.startAt ? new Date(String(body.startAt)) : new Date();
  const endAt = body.endAt ? new Date(String(body.endAt)) : new Date(startAt.getTime() + 2 * 3600000);
  const subjectId = body.subjectId ? String(body.subjectId) : null;

  if (subjectId) {
    const enrolled = await prisma.subjectEnrollment.findFirst({
      where: { studentId: session.user.id, subjectId },
    });
    if (!enrolled) {
      return NextResponse.json({ error: 'Not enrolled in subject' }, { status: 403 });
    }
  }

  try {
    const exam = await prisma.exam.create({
      data: {
        title,
        date: startAt,
        endAt,
        subjectId,
        ownerStudentId: subjectId ? null : session.user.id,
        createdById: session.user.id,
        building: body.building || null,
        room: body.room || null,
        seatNumber: body.seatNumber || null,
        onlineUrl: body.onlineUrl || null,
        professor: body.professor || null,
        location: body.location || null,
        description: body.description || null,
        difficulty: body.difficulty ? parseInt(String(body.difficulty), 10) : 3,
        weight: body.weight ? parseFloat(String(body.weight)) : 1,
        contentVolume: body.contentVolume ? parseInt(String(body.contentVolume), 10) : 5,
      },
    });

    await syncExamToCalendars(exam.id);
    await syncExamAnnouncement(exam.id);
    const exams = await loadStudentExamsHub(session.user.id);
    const card = exams.find((e) => e.id === exam.id);
    return NextResponse.json({ exam: card }, { status: 201 });
  } catch (error) {
    if (isPrismaSchemaMismatchError(error)) {
      return NextResponse.json({ error: 'Exams storage not ready', code: 'EXAMS_DB_NOT_READY' }, { status: 503 });
    }
    throw error;
  }
}
