import { addMonths, startOfMonth, subMonths } from 'date-fns';
import { requireSession } from '@/lib/session';
import { loadCalendarPreferences, loadUnifiedCalendar } from '@/lib/student/unified-calendar';
import { CalendarSystemClient } from '@/components/student/calendar/calendar-system-client';

export default async function StudentCalendarPage() {
  const session = await requireSession('STUDENT');
  const now = new Date();
  const rangeStart = subMonths(startOfMonth(now), 2);
  const rangeEnd = addMonths(startOfMonth(now), 4);

  const [events, preferences] = await Promise.all([
    loadUnifiedCalendar(session.user.id, session.user.email ?? '', rangeStart, rangeEnd),
    loadCalendarPreferences(session.user.id),
  ]);

  return (
    <CalendarSystemClient
      userId={session.user.id}
      initialEvents={events}
      preferences={preferences}
    />
  );
}
