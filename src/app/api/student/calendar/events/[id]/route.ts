import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import type { CalendarLayer, CalendarQuickType, CalendarRecurrence } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ensureStudentCalendarTables } from '@/lib/db/ensure-calendar-schema';
import { isPrismaSchemaMismatchError } from '@/lib/prisma-errors';

const LAYERS = new Set<string>(['ACADEMIC', 'CAREER', 'STARTUP', 'PERSONAL', 'SOCIAL']);
const QUICK = new Set<string>(['TASK', 'EVENT', 'STUDY_SESSION', 'REMINDER', 'MEETING', 'EXAM']);
const REC = new Set<string>(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM']);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureStudentCalendarTables();
  const { id } = await params;
  const baseId = id.replace(/-r\d+$/, '');

  const existing = await prisma.studentCalendarEvent.findFirst({
    where: { id: baseId, studentId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  const cat: CalendarLayer =
    body.category && LAYERS.has(body.category) ? body.category : existing.category;
  const qt: CalendarQuickType =
    body.quickType && QUICK.has(body.quickType) ? body.quickType : existing.quickType;
  const rec: CalendarRecurrence =
    body.recurrence && REC.has(body.recurrence) ? body.recurrence : existing.recurrence;

  try {
    const updated = await prisma.studentCalendarEvent.update({
      where: { id: baseId },
      data: {
        title: body.title ?? existing.title,
        description: body.description !== undefined ? body.description : existing.description,
        category: cat,
        quickType: qt,
        startAt: body.startAt ? new Date(body.startAt) : existing.startAt,
        endAt: body.endAt ? new Date(body.endAt) : existing.endAt,
        allDay: body.allDay !== undefined ? !!body.allDay : existing.allDay,
        color: body.color ?? existing.color,
        location: body.location !== undefined ? body.location : existing.location,
        room: body.room !== undefined ? body.room : existing.room,
        professor: body.professor !== undefined ? body.professor : existing.professor,
        recurrence: rec,
        taggedEmails: Array.isArray(body.taggedEmails)
          ? body.taggedEmails.map((e: string) => e.toLowerCase().trim()).filter(Boolean)
          : existing.taggedEmails,
      },
    });
    return NextResponse.json({ event: updated });
  } catch (error) {
    if (isPrismaSchemaMismatchError(error)) {
      return NextResponse.json({ error: 'Calendar storage not ready' }, { status: 503 });
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

  await ensureStudentCalendarTables();
  const { id } = await params;
  const baseId = id.replace(/-r\d+$/, '');

  const existing = await prisma.studentCalendarEvent.findFirst({
    where: { id: baseId, studentId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.studentCalendarEvent.delete({ where: { id: baseId } });
  return NextResponse.json({ ok: true });
}
