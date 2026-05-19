import type { ClassSessionType } from '@prisma/client';
import type { CalendarClass } from '@/lib/student/weekly-schedule';
import { DEFAULT_CLASS_COLORS, durationMinutes } from '@/lib/student/weekly-schedule';

const PREFIX = 'unibridge-schedule-v1';

function storageKey(userId: string) {
  return `${PREFIX}:${userId}`;
}

export interface LocalClassPayload {
  subjectName: string;
  subjectId: string | null;
  classType: ClassSessionType;
  professor: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  repeatWeekly: boolean;
  building: string | null;
  room: string | null;
  isOnline: boolean;
  color: string;
}

function toCalendarClass(id: string, p: LocalClassPayload): CalendarClass {
  return {
    id,
    source: 'student',
    subjectName: p.subjectName,
    subjectId: p.subjectId,
    classType: p.classType,
    professor: p.professor,
    dayOfWeek: p.dayOfWeek,
    startTime: p.startTime,
    endTime: p.endTime,
    building: p.building,
    room: p.room,
    isOnline: p.isOnline,
    color: p.color,
    attendancePercent: null,
    repeatWeekly: p.repeatWeekly,
    canEdit: true,
    durationMinutes: durationMinutes(p.startTime, p.endTime),
  };
}

export function loadLocalScheduleClasses(userId: string): CalendarClass[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, LocalClassPayload>;
    return Object.entries(parsed).map(([id, p]) => toCalendarClass(id, p));
  } catch {
    return [];
  }
}

export function saveLocalScheduleClass(userId: string, id: string, payload: LocalClassPayload) {
  if (typeof window === 'undefined') return;
  const raw = localStorage.getItem(storageKey(userId));
  const parsed: Record<string, LocalClassPayload> = raw ? JSON.parse(raw) : {};
  parsed[id] = payload;
  localStorage.setItem(storageKey(userId), JSON.stringify(parsed));
}

export function removeLocalScheduleClass(userId: string, id: string) {
  if (typeof window === 'undefined') return;
  const raw = localStorage.getItem(storageKey(userId));
  if (!raw) return;
  const parsed = JSON.parse(raw) as Record<string, LocalClassPayload>;
  delete parsed[id];
  localStorage.setItem(storageKey(userId), JSON.stringify(parsed));
}

export function createLocalClassId() {
  return `local-${crypto.randomUUID()}`;
}

export function isLocalClassId(id: string) {
  return id.startsWith('local-');
}
