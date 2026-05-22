import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ensureSubjectCalendarTables } from '@/lib/db/ensure-subject-calendar-schema';
import { requireTeacherSubject } from '@/lib/teacher/subject-auth';
import { loadSubjectCalendarHub } from '@/lib/teacher/subject-calendar-hub';
import {
  buildStartEndFromForm,
  defaultSemesterEnd,
  notifySubjectCalendarChange,
  removeSubjectCalendarEventFromUsers,
  syncSubjectCalendarEventToUsers,
} from '@/lib/teacher/subject-calendar-sync';
import { colorForEventType, SUBJECT_EVENT_TYPES } from '@/lib/teacher/subject-event-types';

const VALID_TYPES = new Set(SUBJECT_EVENT_TYPES.map((t) => t.id));

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; eventId: string }> }
) {
  const { subjectId, eventId } = await params;
  const auth = await requireTeacherSubject(subjectId);
  if (auth.error) return auth.error;

  const ready = await ensureSubjectCalendarTables();
  if (!ready) {
    return NextResponse.json({ error: 'Calendar storage not ready' }, { status: 503 });
  }

  const existing = await prisma.subjectCalendarEvent.findFirst({
    where: { id: eventId, subjectId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  const body = await request.json();
  const occurrence = body.occurrence ? String(body.occurrence) : null;

  if (occurrence && body.action === 'exclude') {
    const exclude = new Set(existing.excludeDates);
    exclude.add(occurrence);
    const updated = await prisma.subjectCalendarEvent.update({
      where: { id: eventId },
      data: { excludeDates: [...exclude] },
    });
    await syncSubjectCalendarEventToUsers(eventId);
    await notifySubjectCalendarChange(
      subjectId,
      `Class cancelled: ${existing.title}`,
      `${formatOccurrence(occurrence)} removed from ${auth.subject!.name} calendar.`,
      existing.notifyOnChange
    );
    const hub = await loadSubjectCalendarHub(subjectId);
    return NextResponse.json({ event: updated, ...hub });
  }

  const eventType = body.eventType ? String(body.eventType) : existing.eventType;
  if (body.eventType && !VALID_TYPES.has(eventType as (typeof SUBJECT_EVENT_TYPES)[number]['id'])) {
    return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
  }

  let startAt = existing.startAt;
  let endAt = existing.endAt;
  if (body.date && body.startTime && body.endTime) {
    const built = buildStartEndFromForm({
      date: String(body.date),
      startTime: String(body.startTime),
      endTime: String(body.endTime),
    });
    startAt = built.startAt;
    endAt = built.endAt;
  }

  const repeatWeekly =
    body.repeatWeekly !== undefined
      ? !!body.repeatWeekly && eventType === 'CLASS'
      : existing.repeatWeekly;

  let repeatUntil = existing.repeatUntil;
  if (repeatWeekly) {
    if (body.repeatUntilEndOfSemester) {
      repeatUntil = defaultSemesterEnd(startAt);
    } else if (body.repeatUntil !== undefined) {
      repeatUntil = body.repeatUntil ? new Date(String(body.repeatUntil)) : null;
    }
  } else {
    repeatUntil = null;
  }

  const updated = await prisma.subjectCalendarEvent.update({
    where: { id: eventId },
    data: {
      title: body.title !== undefined ? String(body.title).trim() : undefined,
      eventType,
      startAt,
      endAt,
      location: body.location !== undefined ? (body.location ? String(body.location) : null) : undefined,
      room: body.room !== undefined ? (body.room ? String(body.room) : null) : undefined,
      description:
        body.description !== undefined ? (body.description ? String(body.description) : null) : undefined,
      color: body.color ? String(body.color) : body.eventType ? colorForEventType(eventType) : undefined,
      repeatWeekly,
      repeatUntil,
      notifyOnChange: body.notifyStudents !== undefined ? body.notifyStudents !== false : undefined,
    },
  });

  await syncSubjectCalendarEventToUsers(eventId);
  await notifySubjectCalendarChange(
    subjectId,
    `Calendar updated: ${updated.title}`,
    `${auth.subject!.name} — check your Academics calendar.`,
    updated.notifyOnChange
  );

  const hub = await loadSubjectCalendarHub(subjectId);
  return NextResponse.json({ event: updated, ...hub });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; eventId: string }> }
) {
  const { subjectId, eventId } = await params;
  const auth = await requireTeacherSubject(subjectId);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const occurrence = searchParams.get('occurrence');

  const existing = await prisma.subjectCalendarEvent.findFirst({
    where: { id: eventId, subjectId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  if (occurrence && existing.repeatWeekly) {
    const exclude = new Set(existing.excludeDates);
    exclude.add(occurrence);
    const updated = await prisma.subjectCalendarEvent.update({
      where: { id: eventId },
      data: { excludeDates: [...exclude] },
    });
    await syncSubjectCalendarEventToUsers(eventId);
    await notifySubjectCalendarChange(
      subjectId,
      `Class cancelled: ${existing.title}`,
      `${formatOccurrence(occurrence)} removed from your calendar.`,
      existing.notifyOnChange
    );
    const hub = await loadSubjectCalendarHub(subjectId);
    return NextResponse.json({ event: updated, ...hub });
  }

  await removeSubjectCalendarEventFromUsers(eventId);
  await prisma.subjectCalendarEvent.delete({ where: { id: eventId } });
  await notifySubjectCalendarChange(
    subjectId,
    `Event removed: ${existing.title}`,
    `${auth.subject!.name} — removed from your calendar.`,
    existing.notifyOnChange
  );

  const hub = await loadSubjectCalendarHub(subjectId);
  return NextResponse.json(hub);
}

function formatOccurrence(key: string): string {
  try {
    return new Date(key).toLocaleDateString();
  } catch {
    return key;
  }
}
