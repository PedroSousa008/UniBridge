import { addDays, addMonths, format, startOfMonth, subMonths } from 'date-fns';
import type { CalendarLayer } from '@prisma/client';
import { prisma } from '@/lib/db';
import { ensureSubjectCalendarTables } from '@/lib/db/ensure-subject-calendar-schema';
import {
  expandSubjectEventInstances,
  type SubjectCalendarEventRow,
} from '@/lib/teacher/subject-calendar-sync';
import { labelForEventType } from '@/lib/teacher/subject-event-types';
import type { UnifiedCalendarEvent } from '@/lib/student/unified-calendar';

export type SubjectCalendarEventDto = {
  id: string;
  title: string;
  eventType: string;
  eventTypeLabel: string;
  startAt: string;
  endAt: string;
  location: string | null;
  room: string | null;
  description: string | null;
  color: string;
  repeatWeekly: boolean;
  repeatUntil: string | null;
  excludeDates: string[];
  notifyOnChange: boolean;
};

function toRow(e: {
  id: string;
  subjectId: string;
  createdById: string;
  title: string;
  eventType: string;
  startAt: Date;
  endAt: Date;
  location: string | null;
  room: string | null;
  description: string | null;
  color: string;
  repeatWeekly: boolean;
  repeatUntil: Date | null;
  excludeDates: string[];
  notifyOnChange: boolean;
}): SubjectCalendarEventRow {
  return {
    id: e.id,
    subjectId: e.subjectId,
    createdById: e.createdById,
    title: e.title,
    eventType: e.eventType,
    startAt: e.startAt,
    endAt: e.endAt,
    location: e.location,
    room: e.room,
    description: e.description,
    color: e.color,
    repeatWeekly: e.repeatWeekly,
    repeatUntil: e.repeatUntil,
    excludeDates: e.excludeDates ?? [],
    notifyOnChange: e.notifyOnChange,
  };
}

function subTypeForEventType(type: string): string {
  if (type === 'EXAM' || type === 'TEST' || type === 'MINI_TEST') return 'exam';
  if (type === 'ASSIGNMENT_DEADLINE' || type === 'PROJECT_DEADLINE') return 'assignment';
  if (type === 'CLASS' || type === 'EXTRA_CLASS' || type === 'LAB_SESSION') return 'class';
  return 'event';
}

export async function loadSubjectCalendarHub(
  subjectId: string,
  options?: { editable?: boolean }
): Promise<{
  events: UnifiedCalendarEvent[];
  raw: SubjectCalendarEventDto[];
}> {
  const editable = options?.editable ?? true;
  await ensureSubjectCalendarTables();

  const rangeStart = subMonths(startOfMonth(new Date()), 2);
  const rangeEnd = addMonths(startOfMonth(new Date()), 8);

  let stored: Awaited<ReturnType<typeof prisma.subjectCalendarEvent.findMany>> = [];
  try {
    stored = await prisma.subjectCalendarEvent.findMany({
      where: { subjectId },
      orderBy: { startAt: 'asc' },
    });
  } catch {
    stored = [];
  }

  const [assignments, exams] = await Promise.all([
    prisma.assignment.findMany({
      where: { subjectId },
      select: { id: true, title: true, dueDate: true },
    }),
    prisma.exam.findMany({
      where: { subjectId },
      select: { id: true, title: true, date: true },
    }),
  ]);

  const display: UnifiedCalendarEvent[] = [];

  for (const e of stored) {
    const row = toRow(e);
    const instances = expandSubjectEventInstances(row, rangeStart, rangeEnd);
    for (const inst of instances) {
      display.push({
        id: `${e.id}:${inst.instanceKey}`,
        title: e.title,
        description: e.description,
        start: inst.startAt.toISOString(),
        end: inst.endAt.toISOString(),
        allDay: false,
        layer: 'ACADEMIC' as CalendarLayer,
        subType: subTypeForEventType(e.eventType),
        color: e.color,
        location: e.location,
        source: 'subject-calendar',
        sourceId: e.id,
        editable,
        href: null,
        professor: null,
        recurrence: e.repeatWeekly ? 'WEEKLY' : 'NONE',
        seriesId: e.repeatWeekly ? e.id : null,
      });
    }
  }

  for (const a of assignments) {
    const d = new Date(a.dueDate);
    const end = new Date(d);
    end.setHours(end.getHours() + 1);
    display.push({
      id: `assignment:${a.id}`,
      title: a.title,
      description: 'Assignment deadline (gradebook)',
      start: d.toISOString(),
      end: end.toISOString(),
      allDay: false,
      layer: 'ACADEMIC',
      subType: 'assignment',
      color: '#ef4444',
      location: null,
      source: 'assignment',
      sourceId: a.id,
      editable: false,
      href: null,
      professor: null,
      recurrence: 'NONE',
      seriesId: null,
    });
  }

  for (const ex of exams) {
    const d = new Date(ex.date);
    const end = new Date(d);
    end.setHours(end.getHours() + 2);
    display.push({
      id: `exam:${ex.id}`,
      title: ex.title,
      description: 'Exam (gradebook)',
      start: d.toISOString(),
      end: end.toISOString(),
      allDay: false,
      layer: 'ACADEMIC',
      subType: 'exam',
      color: '#dc2626',
      location: null,
      source: 'exam',
      sourceId: ex.id,
      editable: false,
      href: null,
      professor: null,
      recurrence: 'NONE',
      seriesId: null,
    });
  }

  display.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const raw: SubjectCalendarEventDto[] = stored.map((e) => ({
    id: e.id,
    title: e.title,
    eventType: e.eventType,
    eventTypeLabel: labelForEventType(e.eventType),
    startAt: e.startAt.toISOString(),
    endAt: e.endAt.toISOString(),
    location: e.location,
    room: e.room,
    description: e.description,
    color: e.color,
    repeatWeekly: e.repeatWeekly,
    repeatUntil: e.repeatUntil?.toISOString() ?? null,
    excludeDates: e.excludeDates ?? [],
    notifyOnChange: e.notifyOnChange,
  }));

  return { events: display, raw };
}

export function serializeSubjectCalendarHub(hub: Awaited<ReturnType<typeof loadSubjectCalendarHub>>) {
  return hub;
}
