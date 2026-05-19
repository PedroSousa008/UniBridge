import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ClassSessionType } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ensureStudentWeeklyClassTable } from '@/lib/db/ensure-schedule-schema';
import { isPrismaSchemaMismatchError } from '@/lib/prisma-errors';
import { DEFAULT_CLASS_COLORS, durationMinutes } from '@/lib/student/weekly-schedule';

const TYPES = new Set<string>(Object.values(ClassSessionType));

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureStudentWeeklyClassTable();

  try {
    const classes = await prisma.studentWeeklyClass.findMany({
      where: { studentId: session.user.id },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    return NextResponse.json({ classes });
  } catch (error) {
    if (isPrismaSchemaMismatchError(error)) {
      return NextResponse.json({ classes: [] });
    }
    throw error;
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const {
    subjectName,
    subjectId,
    classType,
    professor,
    dayOfWeek,
    startTime,
    endTime,
    repeatWeekly,
    building,
    room,
    isOnline,
    color,
  } = body;

  if (!subjectName || dayOfWeek == null || !startTime || !endTime) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (durationMinutes(startTime, endTime) <= 0) {
    return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
  }

  const type: ClassSessionType = TYPES.has(classType) ? classType : 'LECTURE';

  if (subjectId) {
    const enrolled = await prisma.subjectEnrollment.findUnique({
      where: {
        subjectId_studentId: { subjectId, studentId: session.user.id },
      },
    });
    if (!enrolled) {
      return NextResponse.json({ error: 'Subject not enrolled' }, { status: 400 });
    }
  }

  const ready = await ensureStudentWeeklyClassTable();
  if (!ready) {
    return NextResponse.json(
      {
        error:
          'Could not initialize schedule storage. Your class was not saved — please try again in a moment.',
        code: 'SCHEDULE_DB_NOT_READY',
      },
      { status: 503 }
    );
  }

  try {
    const created = await prisma.studentWeeklyClass.create({
      data: {
        studentId: session.user.id,
        subjectName: String(subjectName),
        subjectId: subjectId || null,
        classType: type,
        professor: professor || null,
        dayOfWeek: Number(dayOfWeek),
        startTime: String(startTime),
        endTime: String(endTime),
        repeatWeekly: repeatWeekly !== false,
        building: building || null,
        room: room || null,
        isOnline: !!isOnline,
        color: color || DEFAULT_CLASS_COLORS[type],
      },
    });
    return NextResponse.json({ class: created });
  } catch (error) {
    if (isPrismaSchemaMismatchError(error)) {
      return NextResponse.json(
        {
          error:
            'Schedule storage is not ready. Ask your admin to run the database migration (npm run db:push).',
        },
        { status: 503 }
      );
    }
    throw error;
  }
}
