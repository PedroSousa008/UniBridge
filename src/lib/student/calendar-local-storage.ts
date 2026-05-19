import type { CalendarLayer, CalendarQuickType, CalendarRecurrence } from '@prisma/client';
import type { UnifiedCalendarEvent } from '@/lib/student/unified-calendar';

const PREFIX = 'unibridge-calendar-v1';

function key(userId: string) {
  return `${PREFIX}:${userId}`;
}

export interface LocalCalendarPayload {
  title: string;
  description?: string | null;
  category: CalendarLayer;
  quickType: CalendarQuickType;
  startAt: string;
  endAt: string;
  allDay: boolean;
  color: string;
  location?: string | null;
  recurrence: CalendarRecurrence;
  taggedEmails: string[];
}

export function loadLocalCalendarEvents(userId: string): UnifiedCalendarEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, LocalCalendarPayload>;
    return Object.entries(parsed).map(([id, p]) => payloadToEvent(id, p));
  } catch {
    return [];
  }
}

function payloadToEvent(id: string, p: LocalCalendarPayload): UnifiedCalendarEvent {
  return {
    id,
    title: p.title,
    description: p.description ?? null,
    start: p.startAt,
    end: p.endAt,
    allDay: p.allDay,
    layer: p.category,
    subType: p.quickType.toLowerCase(),
    color: p.color,
    location: p.location ?? null,
    source: 'custom',
    sourceId: id.replace(/^local-/, ''),
    editable: true,
    href: null,
    professor: null,
    recurrence: p.recurrence,
    seriesId: null,
  };
}

export function saveLocalCalendarEvent(userId: string, id: string, payload: LocalCalendarPayload) {
  if (typeof window === 'undefined') return;
  const raw = localStorage.getItem(key(userId));
  const parsed: Record<string, LocalCalendarPayload> = raw ? JSON.parse(raw) : {};
  parsed[id] = payload;
  localStorage.setItem(key(userId), JSON.stringify(parsed));
}

export function removeLocalCalendarEvent(userId: string, id: string) {
  if (typeof window === 'undefined') return;
  const raw = localStorage.getItem(key(userId));
  if (!raw) return;
  const parsed = JSON.parse(raw) as Record<string, LocalCalendarPayload>;
  delete parsed[id];
  localStorage.setItem(key(userId), JSON.stringify(parsed));
}

export function createLocalCalendarId() {
  return `local-${crypto.randomUUID()}`;
}

export function isLocalCalendarId(id: string) {
  return id.startsWith('local-');
}
