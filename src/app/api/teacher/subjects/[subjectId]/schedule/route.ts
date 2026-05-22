import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacherSubject } from '@/lib/teacher/subject-auth';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const auth = await requireTeacherSubject(subjectId);
  if (auth.error) return auth.error;

  const [scheduleSlots, officeHours, exams, assignments] = await Promise.all([
    prisma.subjectScheduleSlot.findMany({
      where: { subjectId },
      orderBy: { dayOfWeek: 'asc' },
    }),
    prisma.subjectOfficeHours.findMany({
      where: { subjectId },
      orderBy: { dayOfWeek: 'asc' },
    }),
    prisma.exam.findMany({ where: { subjectId }, orderBy: { date: 'asc' } }),
    prisma.assignment.findMany({
      where: { subjectId },
      select: { id: true, title: true, dueDate: true },
      orderBy: { dueDate: 'asc' },
    }),
  ]);

  return NextResponse.json({ scheduleSlots, officeHours, exams, assignments });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const auth = await requireTeacherSubject(subjectId);
  if (auth.error) return auth.error;

  const body = await request.json();
  const kind = body.kind === 'office_hours' ? 'office_hours' : 'class';

  if (kind === 'office_hours') {
    const slot = await prisma.subjectOfficeHours.create({
      data: {
        subjectId,
        dayOfWeek: Number(body.dayOfWeek ?? 1),
        startTime: String(body.startTime || '09:00'),
        endTime: String(body.endTime || '10:00'),
        location: body.location ? String(body.location) : null,
      },
    });
    return NextResponse.json({ slot, kind }, { status: 201 });
  }

  const slot = await prisma.subjectScheduleSlot.create({
    data: {
      subjectId,
      dayOfWeek: Number(body.dayOfWeek ?? 1),
      startTime: String(body.startTime || '09:00'),
      endTime: String(body.endTime || '10:30'),
      room: body.room ? String(body.room) : null,
      label: body.label ? String(body.label) : null,
    },
  });

  return NextResponse.json({ slot, kind: 'class' }, { status: 201 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const auth = await requireTeacherSubject(subjectId);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const slotId = searchParams.get('slotId');
  const kind = searchParams.get('kind') || 'class';
  if (!slotId) {
    return NextResponse.json({ error: 'slotId required' }, { status: 400 });
  }

  if (kind === 'office_hours') {
    await prisma.subjectOfficeHours.deleteMany({ where: { id: slotId, subjectId } });
  } else {
    await prisma.subjectScheduleSlot.deleteMany({ where: { id: slotId, subjectId } });
  }

  return NextResponse.json({ ok: true });
}
