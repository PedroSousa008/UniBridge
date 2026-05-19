import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  markAllAnnouncementsRead,
  markAnnouncementRead,
} from '@/lib/student/student-announcements';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  if (body.all === true) {
    await markAllAnnouncementsRead(session.user.id);
    return NextResponse.json({ ok: true });
  }

  const kind = body.kind as 'subject' | 'university';
  const id = String(body.id || '');
  if (!id || !['subject', 'university'].includes(kind)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  await markAnnouncementRead(session.user.id, { kind, id });
  return NextResponse.json({ ok: true });
}
