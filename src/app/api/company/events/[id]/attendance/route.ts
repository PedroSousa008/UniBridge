import { NextRequest, NextResponse } from 'next/server';
import { markEventAttendance } from '@/lib/company/company-events-hub';
import { requireSession } from '@/lib/session';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession('COMPANY');
  const { id } = await params;
  const body = (await req.json()) as { studentUserId?: string; attended?: boolean };
  if (!body.studentUserId) {
    return NextResponse.json({ error: 'studentUserId required' }, { status: 400 });
  }
  const detail = await markEventAttendance(
    session.user.id,
    id,
    body.studentUserId,
    body.attended !== false
  );
  if (!detail) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(detail);
}
