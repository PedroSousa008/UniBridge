import { addDays, addWeeks, format, startOfDay } from 'date-fns';
import { prisma } from '@/lib/db';
import { ensureStudentCalendarTables } from '@/lib/db/ensure-calendar-schema';
import { ensureSubjectCalendarTables } from '@/lib/db/ensure-subject-calendar-schema';
import { colorForEventType, labelForEventType } from '@/lib/teacher/subject-event-types';

export const subjectCalendarSourceRef = (eventId: string, instanceKey?: string) =>
  instanceKey ? `subject-cal:${eventId}:${instanceKey}` : `subject-cal:${eventId}`;

export function defaultSemesterEnd(from = new Date()): Date {
  const year = from.getMonth() >= 7 ? from.getFullYear() + 1 : from.getFullYear();
  return new Date(year, 5, 30, 23, 59, 59);
}

function parseTimeOnDate(date: Date, time: string): Date {
  const [h, m] = time.split(':').map((x) => parseInt(x, 10));
  const d = new Date(date);
  d.setHours(Number.isNaN(h) ? 9 : h, Number.isNaN(m) ? 0 : m, 0, 0);
  return d;
}

export type SubjectCalendarEventRow = {
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
};

export function expandSubjectEventInstances(
  event: SubjectCalendarEventRow,
  rangeStart: Date,
  rangeEnd: Date
): { instanceKey: string; startAt: Date; endAt: Date }[] {
  if (!event.repeatWeekly) {
    return [{ instanceKey: 'once', startAt: event.startAt, endAt: event.endAt }];
  }

  const until = event.repeatUntil ?? defaultSemesterEnd(event.startAt);
  const exclude = new Set(event.excludeDates);
  const out: { instanceKey: string; startAt: Date; endAt: Date }[] = [];
  const duration = event.endAt.getTime() - event.startAt.getTime();

  let cursor = new Date(event.startAt);
  let i = 0;
  while (cursor <= until && i < 52) {
    const key = format(cursor, 'yyyy-MM-dd');
    if (cursor >= rangeStart && cursor <= rangeEnd && !exclude.has(key)) {
      out.push({
        instanceKey: key,
        startAt: new Date(cursor),
        endAt: new Date(cursor.getTime() + duration),
      });
    }
    cursor = addWeeks(cursor, 1);
    i++;
  }
  return out;
}

async function calendarUserIds(subjectId: string): Promise<string[]> {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: {
      teacher: { select: { userId: true } },
      enrollments: { select: { studentId: true } },
    },
  });
  if (!subject) return [];
  const ids = new Set<string>();
  for (const e of subject.enrollments) ids.add(e.studentId);
  if (subject.teacher?.userId) ids.add(subject.teacher.userId);
  return [...ids];
}

export async function syncSubjectCalendarEventToUsers(eventId: string): Promise<void> {
  await Promise.all([ensureSubjectCalendarTables(), ensureStudentCalendarTables()]);
  if (!(await ensureStudentCalendarTables())) return;

  const event = await prisma.subjectCalendarEvent.findUnique({
    where: { id: eventId },
    include: { subject: { select: { name: true } } },
  });
  if (!event) return;

  const userIds = await calendarUserIds(event.subjectId);
  const rangeStart = addDays(startOfDay(new Date()), -90);
  const rangeEnd = addDays(startOfDay(new Date()), 365);
  const instances = expandSubjectEventInstances(event, rangeStart, rangeEnd);

  await prisma.studentCalendarEvent.deleteMany({
    where: { sourceRef: { startsWith: `subject-cal:${event.id}` } },
  });

  const quickType =
    event.eventType === 'EXAM' || event.eventType === 'TEST' || event.eventType === 'MINI_TEST'
      ? 'EXAM'
      : event.eventType === 'ASSIGNMENT_DEADLINE' || event.eventType === 'PROJECT_DEADLINE'
        ? 'TASK'
        : 'EVENT';

  for (const inst of instances) {
    const ref = subjectCalendarSourceRef(event.id, inst.instanceKey);
    const location = [event.location, event.room].filter(Boolean).join(' · ') || null;
    const payload = {
      title: event.title,
      description:
        event.description ??
        `${labelForEventType(event.eventType)} · ${event.subject.name}`,
      category: 'ACADEMIC' as const,
      quickType: quickType as 'EXAM' | 'TASK' | 'EVENT',
      startAt: inst.startAt,
      endAt: inst.endAt,
      allDay: false,
      color: event.color,
      location,
      room: event.room,
      recurrence: event.repeatWeekly ? ('WEEKLY' as const) : ('NONE' as const),
      sourceRef: ref,
    };

    for (const studentId of userIds) {
      const existing = await prisma.studentCalendarEvent.findFirst({
        where: { studentId, sourceRef: ref },
      });
      if (existing) {
        await prisma.studentCalendarEvent.update({
          where: { id: existing.id },
          data: payload,
        });
      } else {
        await prisma.studentCalendarEvent.create({
          data: {
            ...payload,
            studentId,
            recurrence: 'NONE',
            taggedEmails: [],
          },
        });
      }
    }
  }
}

export async function removeSubjectCalendarEventFromUsers(eventId: string): Promise<void> {
  await prisma.studentCalendarEvent
    .deleteMany({ where: { sourceRef: { startsWith: `subject-cal:${eventId}` } } })
    .catch(() => {});
}

export async function notifySubjectCalendarChange(
  subjectId: string,
  title: string,
  message: string,
  notify: boolean
) {
  if (!notify) return;
  const enrollments = await prisma.subjectEnrollment.findMany({
    where: { subjectId },
    select: { studentId: true },
  });
  for (const e of enrollments) {
    await prisma.notification.create({
      data: {
        userId: e.studentId,
        type: 'ANNOUNCEMENT',
        title,
        message,
        link: '/student/academics/calendar',
      },
    });
  }
}

export function buildStartEndFromForm(input: {
  date: string;
  startTime: string;
  endTime: string;
}): { startAt: Date; endAt: Date } {
  const base = new Date(input.date);
  const startAt = parseTimeOnDate(base, input.startTime);
  let endAt = parseTimeOnDate(base, input.endTime);
  if (endAt <= startAt) endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
  return { startAt, endAt };
}

export { colorForEventType };
