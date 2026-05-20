import { NextRequest, NextResponse } from 'next/server';
import { approveCompanyEvent } from '@/lib/company/company-events-hub';
import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/session';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession('UNIVERSITY');
  const { id } = await params;

  const profile = await prisma.universityProfile.findUnique({
    where: { userId: session.user.id },
    select: { universityId: true },
  });
  if (!profile?.universityId) {
    return NextResponse.json({ error: 'University not linked' }, { status: 400 });
  }

  const event = await approveCompanyEvent(id, profile.universityId);
  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, eventId: event.id, status: event.status });
}
