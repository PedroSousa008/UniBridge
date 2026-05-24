import { addDays, differenceInMinutes, startOfDay } from 'date-fns';
import { prisma } from '@/lib/db';
import { ensureStudentWeeklyClassTable } from '@/lib/db/ensure-schedule-schema';
import { isPrismaSchemaMismatchError } from '@/lib/prisma-errors';
import type { ClassSessionType } from '@prisma/client';

export type { ClassSessionType };

export const CALENDAR_START_HOUR = 7;
export const CALENDAR_END_HOUR = 23;
export const SLOT_MINUTES = 30;
export const PX_PER_SLOT = 28;

export const WEEK_DAYS_MON_FIRST = [
  { dayOfWeek: 1, label: 'Mon', full: 'Monday' },
  { dayOfWeek: 2, label: 'Tue', full: 'Tuesday' },
  { dayOfWeek: 3, label: 'Wed', full: 'Wednesday' },
  { dayOfWeek: 4, label: 'Thu', full: 'Thursday' },
  { dayOfWeek: 5, label: 'Fri', full: 'Friday' },
  { dayOfWeek: 6, label: 'Sat', full: 'Saturday' },
  { dayOfWeek: 0, label: 'Sun', full: 'Sunday' },
] as const;

export const CLASS_TYPE_LABELS: Record<ClassSessionType, string> = {
  LECTURE: 'Lecture',
  WORKSHOP: 'Workshop',
  LAB: 'Lab',
  SEMINAR: 'Seminar',
};

export const DEFAULT_CLASS_COLORS: Record<ClassSessionType, string> = {
  LECTURE: '#3b82f6',
  WORKSHOP: '#f97316',
  LAB: '#a855f7',
  SEMINAR: '#22c55e',
};

export interface CalendarClass {
  id: string;
  source: 'university' | 'student';
  subjectName: string;
  subjectId: string | null;
  classType: ClassSessionType;
  professor: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  building: string | null;
  room: string | null;
  isOnline: boolean;
  color: string;
  attendancePercent: number | null;
  repeatWeekly: boolean;
  canEdit: boolean;
  durationMinutes: number;
}

export interface EnrolledSubjectOption {
  id: string;
  name: string;
  code: string | null;
}

export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function minutesToTime(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function durationMinutes(startTime: string, endTime: string): number {
  return Math.max(0, parseTimeToMinutes(endTime) - parseTimeToMinutes(startTime));
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function inferClassType(label: string | null | undefined): ClassSessionType {
  const t = (label ?? '').toLowerCase();
  if (t.includes('workshop')) return 'WORKSHOP';
  if (t.includes('lab')) return 'LAB';
  if (t.includes('seminar')) return 'SEMINAR';
  return 'LECTURE';
}

export function calendarHours(): string[] {
  const hours: string[] = [];
  for (let h = CALENDAR_START_HOUR; h <= CALENDAR_END_HOUR; h++) {
    hours.push(`${String(h).padStart(2, '0')}:00`);
  }
  return hours;
}

export function topOffsetPx(startTime: string): number {
  const start = parseTimeToMinutes(startTime);
  const gridStart = CALENDAR_START_HOUR * 60;
  const diff = start - gridStart;
  return (diff / SLOT_MINUTES) * PX_PER_SLOT;
}

export function heightPx(startTime: string, endTime: string): number {
  const mins = durationMinutes(startTime, endTime);
  return Math.max(PX_PER_SLOT, (mins / SLOT_MINUTES) * PX_PER_SLOT);
}

export function gridTotalHeightPx(): number {
  const totalMinutes = (CALENDAR_END_HOUR - CALENDAR_START_HOUR) * 60;
  return (totalMinutes / SLOT_MINUTES) * PX_PER_SLOT;
}

export function currentTimeLineTopPx(now = new Date()): number | null {
  const h = now.getHours();
  const m = now.getMinutes();
  if (h < CALENDAR_START_HOUR || h > CALENDAR_END_HOUR) return null;
  return topOffsetPx(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
}

export function shouldShowCountdown(
  cls: CalendarClass,
  next: CalendarClass | null,
  now = new Date()
): boolean {
  if (!next || cls.id !== next.id) return false;
  if (cls.dayOfWeek !== now.getDay()) return false;
  const nowMins = now.getHours() * 60 + now.getMinutes();
  return parseTimeToMinutes(cls.startTime) > nowMins;
}

export function nextClassToday(classes: CalendarClass[], now = new Date()): CalendarClass | null {
  const today = now.getDay();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const todayClasses = classes
    .filter((c) => c.dayOfWeek === today && parseTimeToMinutes(c.endTime) > nowMins)
    .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
  return todayClasses[0] ?? null;
}

/** Next class across the weekly schedule (includes ongoing sessions today). */
export function findNextUpcomingClass(
  classes: CalendarClass[],
  now = new Date()
): { cls: CalendarClass; startsAt: Date; endsAt: Date } | null {
  let best: { cls: CalendarClass; startsAt: Date; endsAt: Date; diff: number } | null = null;

  for (let offset = 0; offset < 14; offset++) {
    const day = addDays(startOfDay(now), offset);
    const dow = day.getDay();

    for (const cls of classes) {
      if (cls.dayOfWeek !== dow) continue;

      const startsAt = new Date(day);
      const startMins = parseTimeToMinutes(cls.startTime);
      startsAt.setHours(Math.floor(startMins / 60), startMins % 60, 0, 0);

      const endsAt = new Date(day);
      const endMins = parseTimeToMinutes(cls.endTime);
      endsAt.setHours(Math.floor(endMins / 60), endMins % 60, 0, 0);

      if (endsAt <= now) continue;

      const diff = startsAt.getTime() - now.getTime();
      if (!best || diff < best.diff) {
        best = { cls, startsAt, endsAt, diff };
      }
    }

    if (best) break;
  }

  if (!best) return null;
  return { cls: best.cls, startsAt: best.startsAt, endsAt: best.endsAt };
}

export function formatClassCountdown(target: Date, now = new Date()): string {
  const mins = differenceInMinutes(target, now);
  if (mins <= 0) return 'Now';
  if (mins < 60) return `In ${mins}m`;
  if (mins < 24 * 60) return `In ${Math.floor(mins / 60)}h ${mins % 60}m`;
  const days = Math.ceil(mins / (24 * 60));
  return `In ${days} day${days === 1 ? '' : 's'}`;
}

export function minutesUntilClass(cls: CalendarClass, now = new Date()): number {
  const start = parseTimeToMinutes(cls.startTime);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  return Math.max(0, start - nowMins);
}

async function loadEnrollmentsForSchedule(userId: string) {
  const { getStudentLinkedUniversityId, studentEnrollmentsWhere } = await import(
    '@/lib/academics/enrollments'
  );
  const universityId = await getStudentLinkedUniversityId(userId);
  const enrollmentWhere = studentEnrollmentsWhere(userId, universityId);

  try {
    return await prisma.subjectEnrollment.findMany({
      where: enrollmentWhere,
      include: {
        subject: {
          include: {
            scheduleSlots: { orderBy: { dayOfWeek: 'asc' } },
            teacher: { include: { user: { select: { name: true } } } },
          },
        },
      },
    });
  } catch (error) {
    if (!isPrismaSchemaMismatchError(error)) throw error;
    const rows = await prisma.subjectEnrollment.findMany({
      where: enrollmentWhere,
      include: {
        subject: {
          include: {
            teacher: { include: { user: { select: { name: true } } } },
          },
        },
      },
    });
    return rows.map((row) => ({
      ...row,
      subject: { ...row.subject, scheduleSlots: [] },
    }));
  }
}

async function loadStudentCustomClasses(userId: string) {
  await ensureStudentWeeklyClassTable();
  try {
    return await prisma.studentWeeklyClass.findMany({
      where: { studentId: userId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  } catch (error) {
    if (isPrismaSchemaMismatchError(error)) return [];
    throw error;
  }
}

export async function isScheduleDatabaseReady() {
  return ensureStudentWeeklyClassTable();
}

export async function loadStudentWeeklySchedule(userId: string) {
  const enrollments = await loadEnrollmentsForSchedule(userId);
  const studentClasses = await loadStudentCustomClasses(userId);

  const subjects: EnrolledSubjectOption[] = [];
  const classes: CalendarClass[] = [];

  for (const e of enrollments) {
    if (e.subject.status !== 'ACTIVE') continue;
    subjects.push({
      id: e.subject.id,
      name: e.subject.name,
      code: e.subject.code,
    });

    const professor = e.subject.teacher?.user?.name ?? null;
    const attendancePercent = e.attendance ?? null;

    for (const slot of e.subject.scheduleSlots) {
      const classType = inferClassType(slot.label);
      classes.push({
        id: `uni-${slot.id}`,
        source: 'university',
        subjectName: e.subject.name,
        subjectId: e.subject.id,
        classType,
        professor,
        dayOfWeek: slot.dayOfWeek,
        startTime: normalizeTime(slot.startTime),
        endTime: normalizeTime(slot.endTime),
        building: null,
        room: slot.room,
        isOnline: false,
        color: DEFAULT_CLASS_COLORS[classType],
        attendancePercent,
        repeatWeekly: true,
        canEdit: false,
        durationMinutes: durationMinutes(
          normalizeTime(slot.startTime),
          normalizeTime(slot.endTime)
        ),
      });
    }
  }

  for (const c of studentClasses) {
    classes.push({
      id: c.id,
      source: 'student',
      subjectName: c.subjectName,
      subjectId: c.subjectId,
      classType: c.classType,
      professor: c.professor,
      dayOfWeek: c.dayOfWeek,
      startTime: normalizeTime(c.startTime),
      endTime: normalizeTime(c.endTime),
      building: c.building,
      room: c.room,
      isOnline: c.isOnline,
      color: c.color,
      attendancePercent: c.subjectId
        ? enrollments.find((e) => e.subjectId === c.subjectId)?.attendance ?? null
        : null,
      repeatWeekly: c.repeatWeekly,
      canEdit: true,
      durationMinutes: durationMinutes(
        normalizeTime(c.startTime),
        normalizeTime(c.endTime)
      ),
    });
  }

  return { classes, subjects };
}

function normalizeTime(t: string): string {
  const parts = t.trim().split(':');
  const h = String(Number(parts[0] ?? 0)).padStart(2, '0');
  const m = String(Number(parts[1] ?? 0)).padStart(2, '0');
  return `${h}:${m}`;
}
