import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ensureExamTables } from '@/lib/db/ensure-exam-schema';
import { syncExamAnnouncement } from '@/lib/student/announcement-sync';
import { removeExamFromCalendars, syncExamToCalendars } from '@/lib/student/exam-sync';
import { loadStudentExamsHub } from '@/lib/student/student-exams';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const exams = await loadStudentExamsHub(session.user.id);
  const exam = exams.find((e) => e.id === id);
  if (!exam) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ exam });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ready = await ensureExamTables();
  if (!ready) {
    return NextResponse.json({ error: 'Exams storage not ready', code: 'EXAMS_DB_NOT_READY' }, { status: 503 });
  }

  const { id } = await params;
  const existing = await prisma.exam.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.createdById !== session.user.id) {
    return NextResponse.json({ error: 'Only the creator can edit this exam' }, { status: 403 });
  }

  const body = await request.json();
  const data: Record<string, unknown> = {};

  if (body.title !== undefined) data.title = String(body.title).trim();
  if (body.startAt !== undefined) data.date = new Date(String(body.startAt));
  if (body.endAt !== undefined) data.endAt = new Date(String(body.endAt));
  if (body.building !== undefined) data.building = body.building || null;
  if (body.room !== undefined) data.room = body.room || null;
  if (body.seatNumber !== undefined) data.seatNumber = body.seatNumber || null;
  if (body.onlineUrl !== undefined) data.onlineUrl = body.onlineUrl || null;
  if (body.professor !== undefined) data.professor = body.professor || null;
  if (body.location !== undefined) data.location = body.location || null;
  if (body.description !== undefined) data.description = body.description || null;
  if (body.difficulty !== undefined) data.difficulty = parseInt(String(body.difficulty), 10);
  if (body.weight !== undefined) data.weight = parseFloat(String(body.weight));
  if (body.contentVolume !== undefined) data.contentVolume = parseInt(String(body.contentVolume), 10);

  await prisma.exam.update({ where: { id }, data });
  await syncExamToCalendars(id);
  await syncExamAnnouncement(id);

  const exams = await loadStudentExamsHub(session.user.id);
  return NextResponse.json({ exam: exams.find((e) => e.id === id) });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.exam.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.createdById !== session.user.id) {
    return NextResponse.json({ error: 'Only the creator can delete this exam' }, { status: 403 });
  }

  await removeExamFromCalendars(id);
  await prisma.exam.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
