import { NextRequest, NextResponse } from 'next/server';
import { inviteStudentsToEvent } from '@/lib/company/company-events-hub';
import { getCompanyWorkspaceUserId, requireSession } from '@/lib/session';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession('COMPANY');
  const { id } = await params;
  const body = (await req.json()) as {
    studentUserIds?: string[];
    inviteType?: string;
  };
  const ids = body.studentUserIds?.filter(Boolean) ?? [];
  if (!ids.length) {
    return NextResponse.json({ error: 'No students selected' }, { status: 400 });
  }
  const detail = await inviteStudentsToEvent(
    getCompanyWorkspaceUserId(session),
    id,
    ids,
    body.inviteType ?? 'student'
  );
  if (!detail) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(detail);
}
