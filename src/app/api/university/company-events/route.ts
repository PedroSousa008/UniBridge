import { NextResponse } from 'next/server';
import { loadUniversityPendingEvents } from '@/lib/university/university-pending-events';
import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/session';

export async function GET() {
  const session = await requireSession('UNIVERSITY');
  const profile = await prisma.universityProfile.findUnique({
    where: { userId: session.user.id },
    select: { universityId: true },
  });
  if (!profile?.universityId) {
    return NextResponse.json({ events: [] });
  }

  const events = await loadUniversityPendingEvents(profile.universityId);
  return NextResponse.json({ events });
}
