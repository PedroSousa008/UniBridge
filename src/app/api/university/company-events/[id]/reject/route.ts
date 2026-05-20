import { NextRequest, NextResponse } from 'next/server';
import { rejectCompanyEvent } from '@/lib/company/company-events-hub';
import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/session';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession('UNIVERSITY');
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { reason?: string };

  const profile = await prisma.universityProfile.findUnique({
    where: { userId: session.user.id },
    select: { universityId: true },
  });
  if (!profile?.universityId) {
    return NextResponse.json({ error: 'University not linked' }, { status: 400 });
  }

  const event = await rejectCompanyEvent(id, profile.universityId, body.reason);
  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, eventId: event.id, status: event.status });
}
