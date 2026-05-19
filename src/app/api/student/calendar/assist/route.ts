import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { addMonths, startOfMonth, subMonths } from 'date-fns';
import { authOptions } from '@/lib/auth';
import { loadUnifiedCalendar, runCalendarAssistant } from '@/lib/student/unified-calendar';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { prompt } = await request.json();
  if (!prompt) {
    return NextResponse.json({ error: 'Prompt required' }, { status: 400 });
  }

  const now = new Date();
  const events = await loadUnifiedCalendar(
    session.user.id,
    session.user.email ?? '',
    subMonths(startOfMonth(now), 1),
    addMonths(startOfMonth(now), 2)
  );

  const reply = runCalendarAssistant(String(prompt), events);
  return NextResponse.json({ reply });
}
