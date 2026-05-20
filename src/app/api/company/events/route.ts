import { NextRequest, NextResponse } from 'next/server';
import { createCompanyEvent, loadCompanyEventsHub } from '@/lib/company/company-events-hub';
import { requireSession } from '@/lib/session';

export async function GET() {
  const session = await requireSession('COMPANY');
  const hub = await loadCompanyEventsHub(session.user.id);
  return NextResponse.json(hub);
}

export async function POST(req: NextRequest) {
  const session = await requireSession('COMPANY');
  const body = (await req.json()) as {
    universityId: string;
    title: string;
    description?: string;
    targetDegrees?: string[];
    targetYears?: number[];
    targetSkills?: string[];
    capacity?: number;
    location?: string;
    isOnline?: boolean;
    startsAt: string;
    endsAt: string;
  };

  if (!body.universityId || !body.title || !body.startsAt || !body.endsAt) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  await createCompanyEvent(session.user.id, {
    universityId: body.universityId,
    title: body.title,
    description: body.description,
    targetDegrees: body.targetDegrees,
    targetYears: body.targetYears,
    targetSkills: body.targetSkills,
    capacity: body.capacity,
    location: body.location,
    isOnline: body.isOnline,
    startsAt: new Date(body.startsAt),
    endsAt: new Date(body.endsAt),
  });

  const hub = await loadCompanyEventsHub(session.user.id);
  return NextResponse.json(hub);
}
