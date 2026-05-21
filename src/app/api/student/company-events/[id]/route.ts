import { NextRequest, NextResponse } from 'next/server';
import { loadStudentCompanyEventPage } from '@/lib/student/student-company-event-hub';
import { requireSession } from '@/lib/session';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession('STUDENT');
  const { id } = await params;
  const page = await loadStudentCompanyEventPage(session.user.id, id);
  if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(page);
}
