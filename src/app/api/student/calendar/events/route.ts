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

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ready = await ensureStudentCalendarTables();
  if (!ready) {
    return NextResponse.json({ error: 'Calendar storage not ready', code: 'CALENDAR_DB_NOT_READY' }, { status: 503 });
  }

  const body = await request.json();
  const {
    title,
    description,
    category,
    quickType,
    startAt,
    endAt,
    allDay,
    color,
    location,
    room,
    professor,
    recurrence,
    taggedEmails,
    startupId,
    duplicate,
  } = body;

  if (!title || !startAt || !endAt) {
    return NextResponse.json({ error: 'Title and times required' }, { status: 400 });
  }

  const cat: CalendarLayer = LAYERS.has(category) ? category : 'PERSONAL';
  const qt: CalendarQuickType = QUICK.has(quickType) ? quickType : 'EVENT';
  const rec: CalendarRecurrence = REC.has(recurrence) ? recurrence : 'NONE';

  try {
    const data = {
      studentId: session.user.id,
      title: String(title),
      description: description || null,
      category: cat,
      quickType: qt,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      allDay: !!allDay,
      color: color || '#6366f1',
      location: location || null,
      room: room || null,
      professor: professor || null,
      recurrence: rec,
      taggedEmails: Array.isArray(taggedEmails)
        ? taggedEmails.map((e: string) => e.toLowerCase().trim()).filter(Boolean)
        : [],
      startupId: startupId || null,
    };

    const created = await prisma.studentCalendarEvent.create({ data });

    if (duplicate) {
      const dupStart = new Date(startAt);
      const dupEnd = new Date(endAt);
      dupStart.setDate(dupStart.getDate() + 1);
      dupEnd.setDate(dupEnd.getDate() + 1);
      await prisma.studentCalendarEvent.create({
        data: { ...data, startAt: dupStart, endAt: dupEnd },
      });
    }

    return NextResponse.json({ event: created });
  } catch (error) {
    if (isPrismaSchemaMismatchError(error)) {
      return NextResponse.json({ error: 'Calendar storage not ready', code: 'CALENDAR_DB_NOT_READY' }, { status: 503 });
    }
    throw error;
  }
}
