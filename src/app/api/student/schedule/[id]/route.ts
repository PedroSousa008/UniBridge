import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ClassSessionType } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ensureStudentWeeklyClassTable } from '@/lib/db/ensure-schedule-schema';
import { isPrismaSchemaMismatchError } from '@/lib/prisma-errors';
import { DEFAULT_CLASS_COLORS, durationMinutes } from '@/lib/student/weekly-schedule';

const DB_NOT_READY = {
  error: 'Schedule storage is not ready. Database migration required (npm run db:push).',
};

const TYPES = new Set<string>(Object.values(ClassSessionType));

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  await ensureStudentWeeklyClassTable();

  let existing;
  try {
    existing = await prisma.studentWeeklyClass.findFirst({
      where: { id, studentId: session.user.id },
    });
  } catch (error) {
    if (isPrismaSchemaMismatchError(error)) {
      return NextResponse.json(DB_NOT_READY, { status: 503 });
    }
    throw error;
  }
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  const startTime = body.startTime ?? existing.startTime;
  const endTime = body.endTime ?? existing.endTime;
  if (durationMinutes(startTime, endTime) <= 0) {
    return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
  }

  const type: ClassSessionType =
    body.classType && TYPES.has(body.classType) ? body.classType : existing.classType;

  const ready = await ensureStudentWeeklyClassTable();
  if (!ready) {
    return NextResponse.json({ ...DB_NOT_READY, code: 'SCHEDULE_DB_NOT_READY' }, { status: 503 });
  }

  try {
    const updated = await prisma.studentWeeklyClass.update({
      where: { id },
      data: {
        subjectName: body.subjectName ?? existing.subjectName,
        subjectId: body.subjectId !== undefined ? body.subjectId || null : existing.subjectId,
        classType: type,
        professor: body.professor !== undefined ? body.professor || null : existing.professor,
        dayOfWeek: body.dayOfWeek != null ? Number(body.dayOfWeek) : existing.dayOfWeek,
        startTime: String(startTime),
        endTime: String(endTime),
        repeatWeekly: body.repeatWeekly !== undefined ? !!body.repeatWeekly : existing.repeatWeekly,
        building: body.building !== undefined ? body.building || null : existing.building,
        room: body.room !== undefined ? body.room || null : existing.room,
        isOnline: body.isOnline !== undefined ? !!body.isOnline : existing.isOnline,
        color: body.color ?? DEFAULT_CLASS_COLORS[type],
      },
    });
    return NextResponse.json({ class: updated });
  } catch (error) {
    if (isPrismaSchemaMismatchError(error)) {
      return NextResponse.json(DB_NOT_READY, { status: 503 });
    }
    throw error;
  }
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
  await ensureStudentWeeklyClassTable();

  try {
    const existing = await prisma.studentWeeklyClass.findFirst({
      where: { id, studentId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    await prisma.studentWeeklyClass.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isPrismaSchemaMismatchError(error)) {
      return NextResponse.json(DB_NOT_READY, { status: 503 });
    }
    throw error;
  }
}
