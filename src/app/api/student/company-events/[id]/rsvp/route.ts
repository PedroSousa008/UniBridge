import { NextRequest, NextResponse } from 'next/server';
import {
  loadStudentCompanyEventPage,
  rsvpStudentCompanyEvent,
} from '@/lib/student/student-company-event-hub';
import { requireSession } from '@/lib/session';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession('STUDENT');
  const { id } = await params;
  const result = await rsvpStudentCompanyEvent(session.user.id, id);
  if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const page = await loadStudentCompanyEventPage(session.user.id, id);
  return NextResponse.json({ rsvpStatus: result.status, page });
}
