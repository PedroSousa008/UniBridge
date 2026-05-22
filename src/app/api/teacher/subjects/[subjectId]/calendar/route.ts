import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ensureSubjectCalendarTables } from '@/lib/db/ensure-subject-calendar-schema';
import { requireTeacherSubject } from '@/lib/teacher/subject-auth';
import { loadSubjectCalendarHub } from '@/lib/teacher/subject-calendar-hub';
import {
  buildStartEndFromForm,
  defaultSemesterEnd,
  notifySubjectCalendarChange,
  syncSubjectCalendarEventToUsers,
} from '@/lib/teacher/subject-calendar-sync';
import { colorForEventType, SUBJECT_EVENT_TYPES } from '@/lib/teacher/subject-event-types';

const VALID_TYPES = new Set(SUBJECT_EVENT_TYPES.map((t) => t.id));

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const auth = await requireTeacherSubject(subjectId);
  if (auth.error) return auth.error;

  const hub = await loadSubjectCalendarHub(subjectId);
  return NextResponse.json(hub);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const auth = await requireTeacherSubject(subjectId);
  if (auth.error) return auth.error;

  const ready = await ensureSubjectCalendarTables();
  if (!ready) {
    return NextResponse.json({ error: 'Calendar storage not ready' }, { status: 503 });
  }

  const body = await request.json();
  const eventType = String(body.eventType || 'CUSTOM');
  if (!VALID_TYPES.has(eventType as (typeof SUBJECT_EVENT_TYPES)[number]['id'])) {
    return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
  }

  if (!body.title || !body.date || !body.startTime || !body.endTime) {
    return NextResponse.json({ error: 'Title, date, and times required' }, { status: 400 });
  }

  const { startAt, endAt } = buildStartEndFromForm({
    date: String(body.date),
    startTime: String(body.startTime),
    endTime: String(body.endTime),
  });

  const repeatWeekly = !!body.repeatWeekly && eventType === 'CLASS';
  let repeatUntil: Date | null = null;
  if (repeatWeekly) {
    if (body.repeatUntilEndOfSemester) {
      repeatUntil = defaultSemesterEnd(startAt);
    } else if (body.repeatUntil) {
      repeatUntil = new Date(String(body.repeatUntil));
    } else {
      repeatUntil = defaultSemesterEnd(startAt);
    }
  }

  const created = await prisma.subjectCalendarEvent.create({
    data: {
      subjectId,
      createdById: auth.session!.user!.id,
      title: String(body.title).trim(),
      eventType,
      startAt,
      endAt,
      location: body.location ? String(body.location) : null,
      room: body.room ? String(body.room) : null,
      description: body.description ? String(body.description) : null,
      color: body.color ? String(body.color) : colorForEventType(eventType),
      repeatWeekly,
      repeatUntil,
      excludeDates: [],
      notifyOnChange: body.notifyStudents !== false,
    },
  });

  await syncSubjectCalendarEventToUsers(created.id);
  await notifySubjectCalendarChange(
    subjectId,
    `New ${eventType.replace(/_/g, ' ').toLowerCase()}: ${created.title}`,
    `${auth.subject!.name} — added to your calendar.`,
    created.notifyOnChange
  );

  const hub = await loadSubjectCalendarHub(subjectId);
  return NextResponse.json({ event: created, ...hub }, { status: 201 });
}
