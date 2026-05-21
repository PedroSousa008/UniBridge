import {
  addDays,
  addMonths,
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { CalendarLayer, CalendarQuickType, CalendarRecurrence } from '@prisma/client';
import { prisma } from '@/lib/db';
import { ensureStudentCalendarTables } from '@/lib/db/ensure-calendar-schema';
import { isPrismaSchemaMismatchError } from '@/lib/prisma-errors';
import { loadStudentWeeklySchedule } from '@/lib/student/weekly-schedule';
import { parseTimeToMinutes } from '@/lib/student/weekly-schedule';
import {
  companyEventSourceRef,
  loadApprovedCompanyEventsForCalendarView,
  syncStudentCompanyEventCalendar,
} from '@/lib/company/company-event-calendar-sync';

export type CalendarViewMode = 'month' | 'week' | 'day' | 'agenda';

export const LAYER_LABELS: Record<CalendarLayer, string> = {
  ACADEMIC: 'Academic',
  CAREER: 'Career',
  STARTUP: 'Startup Hub',
  PERSONAL: 'Personal',
  SOCIAL: 'Social',
};

export const LAYER_COLORS: Record<CalendarLayer, string> = {
  ACADEMIC: '#3b82f6',
  CAREER: '#10b981',
  STARTUP: '#8b5cf6',
  PERSONAL: '#f59e0b',
  SOCIAL: '#ec4899',
};

export const SUBTYPE_STYLES: Record<string, { urgent?: boolean; business?: boolean }> = {
  exam: { urgent: true },
  assignment: { urgent: true },
  pitch: { business: true },
  class: {},
  meeting: {},
  study: {},
};

export interface UnifiedCalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start: string;
  end: string;
  allDay: boolean;
  layer: CalendarLayer;
  subType: string;
  color: string;
  location: string | null;
  source: string;
  sourceId: string | null;
  editable: boolean;
  href: string | null;
  professor: string | null;
  recurrence: CalendarRecurrence;
  seriesId: string | null;
}

export interface StudySuggestion {
  id: string;
  message: string;
  suggestedStart: string;
  suggestedEnd: string;
  subjectName: string;
}

export interface CalendarAnalytics {
  mostProductiveDay: string;
  totalStudyHours: number;
  classSessions: number;
  averageFreeHoursPerDay: number;
  busiestWeekday: string;
}

export interface HeatmapDay {
  date: string;
  intensity: number;
  exams: number;
  assignments: number;
}

export interface CalendarPreferences {
  countdownMinutes: number[];
  layersEnabled: Record<CalendarLayer, boolean>;
  googleSyncEnabled: boolean;
  appleSyncEnabled: boolean;
}

const DEFAULT_LAYERS: Record<CalendarLayer, boolean> = {
  ACADEMIC: true,
  CAREER: true,
  STARTUP: true,
  PERSONAL: true,
  SOCIAL: true,
};

const DEFAULT_COUNTDOWN = [10080, 4320, 1440, 720, 120];

function nextWeekdayDate(dayOfWeek: number, hour: number, minute: number, from: Date) {
  const d = new Date(from);
  const diff = (dayOfWeek - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + (diff === 0 && d < from ? 7 : diff));
  d.setHours(hour, minute, 0, 0);
  return d;
}

function classesToEvents(
  classes: Awaited<ReturnType<typeof loadStudentWeeklySchedule>>['classes'],
  rangeStart: Date,
  rangeEnd: Date
) {
  const events: UnifiedCalendarEvent[] = [];
  let cursor = startOfWeek(rangeStart, { weekStartsOn: 1 });

  while (cursor <= rangeEnd) {
    for (const cls of classes) {
      const startM = parseTimeToMinutes(cls.startTime);
      const endM = parseTimeToMinutes(cls.endTime);
      const day = nextWeekdayDate(cls.dayOfWeek, Math.floor(startM / 60), startM % 60, cursor);
      if (day < rangeStart || day > rangeEnd) continue;
      const end = new Date(day);
      end.setHours(Math.floor(endM / 60), endM % 60, 0, 0);
      events.push({
        id: `class-${cls.id}-${day.toISOString()}`,
        title: cls.subjectName,
        description: cls.classType,
        start: day.toISOString(),
        end: end.toISOString(),
        allDay: false,
        layer: 'ACADEMIC',
        subType: 'class',
        color: cls.color,
        location: cls.room,
        source: 'class',
        sourceId: cls.id,
        editable: false,
        href: cls.subjectId ? `/student/academics/subjects/${cls.subjectId}/calendar` : null,
        professor: cls.professor,
        recurrence: 'WEEKLY',
        seriesId: cls.id,
      });
    }
    cursor = addWeeks(cursor, 1);
  }
  return events;
}

export function expandEventRecurrence(
  base: UnifiedCalendarEvent,
  rangeStart: Date,
  rangeEnd: Date
): UnifiedCalendarEvent[] {
  if (base.recurrence === 'NONE') return [base];
  const out: UnifiedCalendarEvent[] = [];
  let start = new Date(base.start);
  let end = new Date(base.end);
  let i = 0;
  while (start <= rangeEnd && i < 80) {
    if (end >= rangeStart) {
      out.push({
        ...base,
        id: `${base.id}-r${i}`,
        start: start.toISOString(),
        end: end.toISOString(),
        seriesId: base.id,
      });
    }
    i++;
    if (base.recurrence === 'DAILY') {
      start = addDays(start, 1);
      end = addDays(end, 1);
    } else if (base.recurrence === 'WEEKLY') {
      start = addWeeks(start, 1);
      end = addWeeks(end, 1);
    } else if (base.recurrence === 'MONTHLY') {
      start = addMonths(start, 1);
      end = addMonths(end, 1);
    } else break;
  }
  return out;
}

export function buildStudySuggestions(
  events: UnifiedCalendarEvent[],
  now = new Date()
): StudySuggestion[] {
  const suggestions: StudySuggestion[] = [];
  const exams = events.filter((e) => e.subType === 'exam' && new Date(e.start) > now);
  const assignments = events.filter(
    (e) => e.subType === 'assignment' && new Date(e.start) > now
  );

  for (const exam of exams.slice(0, 2)) {
    const days = Math.ceil((new Date(exam.start).getTime() - now.getTime()) / 86400000);
    if (days > 14) continue;
    const gap = findFreeGap(events, now, 120);
    if (gap) {
      suggestions.push({
        id: `study-exam-${exam.id}`,
        message: `Exam in ${days} day${days === 1 ? '' : 's'}. ${gap.message}`,
        suggestedStart: gap.start.toISOString(),
        suggestedEnd: gap.end.toISOString(),
        subjectName: exam.title,
      });
    }
  }

  for (const a of assignments.slice(0, 2)) {
    const days = Math.ceil((new Date(a.start).getTime() - now.getTime()) / 86400000);
    if (days > 7) continue;
    const gap = findFreeGap(events, now, 90);
    if (gap) {
      suggestions.push({
        id: `study-asg-${a.id}`,
        message: `Assignment due in ${days} day${days === 1 ? '' : 's'}. ${gap.message}`,
        suggestedStart: gap.start.toISOString(),
        suggestedEnd: gap.end.toISOString(),
        subjectName: a.title,
      });
    }
  }
  return suggestions;
}

function findFreeGap(events: UnifiedCalendarEvent[], from: Date, minutes: number) {
  for (let d = 0; d < 7; d++) {
    const day = addDays(startOfDay(from), d);
    for (const hour of [9, 11, 14, 16, 19]) {
      const start = new Date(day);
      start.setHours(hour, 0, 0, 0);
      const end = new Date(start.getTime() + minutes * 60000);
      if (start < from) continue;
      const clash = events.some((e) => {
        if (e.allDay) return false;
        const es = new Date(e.start);
        const ee = new Date(e.end);
        return start < ee && end > es;
      });
      if (!clash) {
        return {
          start,
          end,
          message: `You have a ${minutes / 60}h free gap ${format(start, 'EEEE')} at ${format(start, 'HH:mm')}. Recommended revision?`,
        };
      }
    }
  }
  return null;
}

export function buildHeatmap(events: UnifiedCalendarEvent[], month: Date): HeatmapDay[] {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const days: HeatmapDay[] = [];
  let cursor = start;
  while (cursor <= end) {
    const dayEnd = endOfDay(cursor);
    const dayEvents = events.filter((e) => {
      const s = new Date(e.start);
      return s >= startOfDay(cursor) && s <= dayEnd;
    });
    const exams = dayEvents.filter((e) => e.subType === 'exam').length;
    const assignments = dayEvents.filter((e) => e.subType === 'assignment').length;
    const intensity = Math.min(5, exams * 2 + assignments + dayEvents.length * 0.5);
    days.push({
      date: format(cursor, 'yyyy-MM-dd'),
      intensity,
      exams,
      assignments,
    });
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function buildAnalytics(events: UnifiedCalendarEvent[]): CalendarAnalytics {
  const byDay: Record<string, number> = {};
  const weekday: Record<string, number> = {};
  let studyHours = 0;
  let classes = 0;

  for (const e of events) {
    const day = format(new Date(e.start), 'yyyy-MM-dd');
    byDay[day] = (byDay[day] ?? 0) + 1;
    const wd = format(new Date(e.start), 'EEEE');
    weekday[wd] = (weekday[wd] ?? 0) + 1;
    if (e.subType === 'study') {
      studyHours +=
        (new Date(e.end).getTime() - new Date(e.start).getTime()) / 3600000;
    }
    if (e.subType === 'class') classes++;
  }

  const mostProductiveDay =
    Object.entries(byDay).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
  const busiestWeekday =
    Object.entries(weekday).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

  return {
    mostProductiveDay: mostProductiveDay !== '—' ? format(new Date(mostProductiveDay), 'MMM d') : '—',
    totalStudyHours: Math.round(studyHours * 10) / 10,
    classSessions: classes,
    averageFreeHoursPerDay: Math.max(0, Math.round((24 - classes * 1.5) * 10) / 10),
    busiestWeekday,
  };
}

export function activeCountdowns(
  events: UnifiedCalendarEvent[],
  countdownMinutes: number[],
  now = new Date()
) {
  const urgent = events.filter((e) =>
    ['exam', 'assignment', 'pitch', 'meeting'].includes(e.subType)
  );
  const results: { event: UnifiedCalendarEvent; label: string }[] = [];

  for (const e of urgent) {
    const start = new Date(e.start);
    const diffMin = Math.floor((start.getTime() - now.getTime()) / 60000);
    if (diffMin <= 0) continue;
    for (const threshold of countdownMinutes.sort((a, b) => a - b)) {
      if (diffMin <= threshold && diffMin > threshold - 60) {
        let label = '';
        if (threshold >= 1440) label = `in ${Math.ceil(diffMin / 1440)} day(s)`;
        else if (threshold >= 60) label = `in ${Math.ceil(diffMin / 60)} hour(s)`;
        else label = `in ${diffMin} min`;
        const prefix =
          e.subType === 'exam'
            ? 'Exam'
            : e.subType === 'assignment'
              ? 'Assignment due'
              : e.subType === 'pitch'
                ? 'Pitch'
                : 'Event';
        results.push({ event: e, label: `${prefix} ${label}` });
        break;
      }
    }
  }
  return results.slice(0, 6);
}

export async function loadCalendarPreferences(studentId: string): Promise<CalendarPreferences> {
  await ensureStudentCalendarTables();
  try {
    const pref = await prisma.studentCalendarPreference.findUnique({
      where: { studentId },
    });
    if (!pref) {
      return {
        countdownMinutes: DEFAULT_COUNTDOWN,
        layersEnabled: DEFAULT_LAYERS,
        googleSyncEnabled: false,
        appleSyncEnabled: false,
      };
    }
    return {
      countdownMinutes: pref.countdownMinutes.length ? pref.countdownMinutes : DEFAULT_COUNTDOWN,
      layersEnabled: {
        ...DEFAULT_LAYERS,
        ...((pref.layersEnabled as Record<CalendarLayer, boolean>) ?? {}),
      },
      googleSyncEnabled: pref.googleSyncEnabled,
      appleSyncEnabled: pref.appleSyncEnabled,
    };
  } catch {
    return {
      countdownMinutes: DEFAULT_COUNTDOWN,
      layersEnabled: DEFAULT_LAYERS,
      googleSyncEnabled: false,
      appleSyncEnabled: false,
    };
  }
}

export async function loadUnifiedCalendar(
  userId: string,
  userEmail: string,
  rangeStart: Date,
  rangeEnd: Date
) {
  await ensureStudentCalendarTables();
  await syncStudentCompanyEventCalendar(userId);

  const hidden = await prisma.studentCalendarHidden
    .findMany({ where: { studentId: userId } })
    .catch(() => []);

  const hiddenSet = new Set(hidden.map((h) => `${h.sourceType}:${h.sourceId}`));

  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { universityId: true },
  });

  const enrollments = await prisma.subjectEnrollment.findMany({
    where: { studentId: userId },
    include: { subject: { select: { id: true, name: true, status: true } } },
  });
  const subjectIds = enrollments.filter((e) => e.subject.status === 'ACTIVE').map((e) => e.subjectId);

  let partnerCompanyEvents: Awaited<
    ReturnType<typeof loadApprovedCompanyEventsForCalendarView>
  > = [];

  const [assignments, exams, universityEvents, customEvents, taggedEvents, milestones] =
    await Promise.all([
      prisma.assignment.findMany({
        where: { subjectId: { in: subjectIds }, dueDate: { gte: rangeStart, lte: rangeEnd } },
        include: { subject: { select: { name: true } } },
      }),
      prisma.exam.findMany({
        where: {
          date: { gte: rangeStart, lte: rangeEnd },
          OR: [
            { subjectId: { in: subjectIds } },
            { ownerStudentId: userId },
          ],
        },
        include: { subject: { select: { name: true } } },
      }),
      profile?.universityId
        ? prisma.calendarEvent.findMany({
            where: {
              universityId: profile.universityId,
              startDate: { gte: rangeStart, lte: rangeEnd },
            },
          })
        : Promise.resolve([]),
      prisma.studentCalendarEvent
        .findMany({
          where: {
            studentId: userId,
            startAt: { lte: rangeEnd },
            endAt: { gte: rangeStart },
          },
        })
        .catch(() => []),
      prisma.studentCalendarEvent
        .findMany({
          where: {
            taggedEmails: { has: userEmail.toLowerCase() },
            NOT: { studentId: userId },
            startAt: { lte: rangeEnd },
            endAt: { gte: rangeStart },
          },
        })
        .catch(() => []),
      prisma.startupMilestone.findMany({
        where: {
          date: { not: null, gte: rangeStart, lte: rangeEnd },
          startup: {
            OR: [{ founderId: userId }, { members: { some: { userId } } }],
          },
        },
        include: { startup: { select: { name: true, id: true } } },
      }),
    ]);

  if (profile?.universityId) {
    try {
      partnerCompanyEvents = await loadApprovedCompanyEventsForCalendarView(
        profile.universityId,
        rangeStart,
        rangeEnd
      );
    } catch {
      partnerCompanyEvents = [];
    }
  }

  let classes: Awaited<ReturnType<typeof loadStudentWeeklySchedule>>['classes'] = [];
  try {
    ({ classes } = await loadStudentWeeklySchedule(userId));
  } catch {
    classes = [];
  }

  const events: UnifiedCalendarEvent[] = [];

  for (const a of assignments) {
    const id = `assignment-${a.id}`;
    if (hiddenSet.has(`assignment:${a.id}`)) continue;
    events.push({
      id,
      title: a.title,
      description: a.subject.name,
      start: a.dueDate.toISOString(),
      end: a.dueDate.toISOString(),
      allDay: false,
      layer: 'ACADEMIC',
      subType: 'assignment',
      color: '#ef4444',
      location: null,
      source: 'assignment',
      sourceId: a.id,
      editable: false,
      href: `/student/academics/assignments?assignment=${a.id}`,
      professor: a.professor ?? null,
      recurrence: 'NONE',
      seriesId: null,
    });
  }

  for (const e of exams) {
    const id = `exam-${e.id}`;
    if (hiddenSet.has(`exam:${e.id}`)) continue;
    const end = e.endAt ?? new Date(e.date.getTime() + 2 * 3600000);
    const location = [e.building, e.location].filter(Boolean).join(' · ') || null;
    events.push({
      id,
      title: e.title,
      description: e.subject?.name ?? null,
      start: e.date.toISOString(),
      end: end.toISOString(),
      allDay: false,
      layer: 'ACADEMIC',
      subType: 'exam',
      color: '#dc2626',
      location,
      source: 'exam',
      sourceId: e.id,
      editable: false,
      href: `/student/academics/exams?exam=${e.id}`,
      professor: e.professor ?? null,
      recurrence: 'NONE',
      seriesId: null,
    });
  }

  for (const u of universityEvents) {
    const id = `university-${u.id}`;
    if (hiddenSet.has(`university:${u.id}`)) continue;
    events.push({
      id,
      title: u.title,
      description: u.description,
      start: u.startDate.toISOString(),
      end: (u.endDate ?? u.startDate).toISOString(),
      allDay: !u.endDate,
      layer: 'ACADEMIC',
      subType: u.eventType?.toLowerCase() ?? 'event',
      color: LAYER_COLORS.ACADEMIC,
      location: null,
      source: 'university',
      sourceId: u.id,
      editable: false,
      href: null,
      professor: null,
      recurrence: 'NONE',
      seriesId: null,
    });
  }

  events.push(...classesToEvents(classes, rangeStart, rangeEnd));

  for (const m of milestones) {
    if (!m.date) continue;
    events.push({
      id: `milestone-${m.id}`,
      title: `${m.startup.name}: ${m.label}`,
      description: m.notes,
      start: m.date.toISOString(),
      end: new Date(m.date.getTime() + 3600000).toISOString(),
      allDay: false,
      layer: 'STARTUP',
      subType: m.key.includes('pitch') ? 'pitch' : 'deadline',
      color: LAYER_COLORS.STARTUP,
      location: null,
      source: 'startup',
      sourceId: m.startupId,
      editable: false,
      href: `/student/startup/${m.startupId}`,
      professor: null,
      recurrence: 'NONE',
      seriesId: null,
    });
  }

  const syncedCompanyRefs = new Set(
    customEvents
      .map((r) => r.sourceRef)
      .filter((ref): ref is string => Boolean(ref?.startsWith('company-event:')))
  );

  const mapCustom = (row: (typeof customEvents)[0], source: string) => {
    const isCompanyEvent = row.sourceRef?.startsWith('company-event:');
    const companyEventId = isCompanyEvent ? row.sourceRef!.slice('company-event:'.length) : null;
    const base: UnifiedCalendarEvent = {
      id: row.id,
      title: row.title,
      description: row.description,
      start: row.startAt.toISOString(),
      end: row.endAt.toISOString(),
      allDay: row.allDay,
      layer: row.category,
      subType: row.quickType.toLowerCase(),
      color: row.color,
      location: row.location,
      source: isCompanyEvent ? 'company-event' : source,
      sourceId: companyEventId ?? row.id,
      editable: source === 'custom' && !isCompanyEvent,
      href: isCompanyEvent && companyEventId ? `/student/academics/events/${companyEventId}` : null,
      professor: row.professor,
      recurrence: row.recurrence,
      seriesId: null,
    };
    return expandEventRecurrence(base, rangeStart, rangeEnd);
  };

  for (const row of customEvents) {
    events.push(...mapCustom(row, row.sourceRef?.startsWith('company-event:') ? 'company-event' : 'custom'));
  }
  for (const row of taggedEvents) events.push(...mapCustom(row, 'tagged'));

  for (const ce of partnerCompanyEvents) {
    const ref = companyEventSourceRef(ce.id);
    if (syncedCompanyRefs.has(ref)) continue;
    if (hiddenSet.has(`company-event:${ce.id}`)) continue;
    events.push({
      id: `company-event-${ce.id}`,
      title: ce.title,
      description: [ce.companyName, ce.description].filter(Boolean).join(' — ') || ce.companyName,
      start: ce.startsAt.toISOString(),
      end: ce.endsAt.toISOString(),
      allDay: false,
      layer: 'CAREER',
      subType: 'event',
      color: ce.color,
      location: ce.isOnline ? 'Online' : ce.location,
      source: 'company-event',
      sourceId: ce.id,
      editable: false,
      href: `/student/academics/events/${ce.id}`,
      professor: null,
      recurrence: 'NONE',
      seriesId: null,
    });
  }

  return events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

export function filterEventsByLayers(
  events: UnifiedCalendarEvent[],
  layers: Record<CalendarLayer, boolean>
) {
  return events.filter((e) => layers[e.layer]);
}

export function searchEvents(events: UnifiedCalendarEvent[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return events;
  return events.filter(
    (e) =>
      e.title.toLowerCase().includes(q) ||
      e.description?.toLowerCase().includes(q) ||
      e.location?.toLowerCase().includes(q) ||
      e.professor?.toLowerCase().includes(q) ||
      e.subType.includes(q)
  );
}

export function runCalendarAssistant(
  prompt: string,
  events: UnifiedCalendarEvent[]
): string {
  const p = prompt.toLowerCase();
  if (p.includes('free') || p.includes('meeting slot')) {
    const gap = findFreeGap(events, new Date(), 60);
    return gap
      ? `Best slot: ${format(new Date(gap.start), 'EEE HH:mm')} – ${format(new Date(gap.end), 'HH:mm')}.`
      : 'No clear 1-hour gap in the next 7 days. Try moving a personal block.';
  }
  if (p.includes('optimize') || p.includes('prepare')) {
    const exams = events.filter((e) => e.subType === 'exam').length;
    const asg = events.filter((e) => e.subType === 'assignment').length;
    return `This week: ${exams} exam(s), ${asg} assignment deadline(s). Block 90-minute study sessions before each deadline and protect one recovery evening.`;
  }
  if (p.includes('reschedule') && p.includes('study')) {
    return 'Move study sessions to mid-week afternoons (14:00–16:00) when you have fewer classes. I can create suggested blocks with Quick Add → Study Session.';
  }
  return 'Try: "Find a free meeting slot", "Optimize my week", or "Prepare my week". I analyze your merged academic, startup, and personal events.';
}

export type { CalendarLayer, CalendarQuickType, CalendarRecurrence };
