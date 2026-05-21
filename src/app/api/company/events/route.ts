import { NextRequest, NextResponse } from 'next/server';
import { createCompanyEvent, loadCompanyEventsHub } from '@/lib/company/company-events-hub';
import type { EventSpeakerCard } from '@/lib/company/company-events-intelligence';
import { getCompanyWorkspaceUserId, requireSession } from '@/lib/session';

export async function GET() {
  const session = await requireSession('COMPANY');
  const hub = await loadCompanyEventsHub(getCompanyWorkspaceUserId(session));
  return NextResponse.json(hub);
}

export async function POST(req: NextRequest) {
  const session = await requireSession('COMPANY');
  const body = (await req.json()) as {
    universityId: string;
    title: string;
    eventType?: string;
    description?: string;
    coverUrl?: string;
    targetDegrees?: string[];
    targetYears?: number[];
    targetSkills?: string[];
    capacity?: number;
    location?: string;
    isOnline?: boolean;
    eventFormat?: string;
    registrationDeadline?: string;
    speakers?: EventSpeakerCard[];
    goals?: string[];
    agenda?: { time: string; label: string }[];
    startsAt: string;
    endsAt: string;
  };

  if (!body.universityId || !body.title || !body.startsAt || !body.endsAt) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  await createCompanyEvent(getCompanyWorkspaceUserId(session), {
    universityId: body.universityId,
    title: body.title,
    eventType: body.eventType,
    description: body.description,
    coverUrl: body.coverUrl,
    targetDegrees: body.targetDegrees,
    targetYears: body.targetYears,
    targetSkills: body.targetSkills,
    capacity: body.capacity,
    location: body.location,
    isOnline: body.isOnline,
    eventFormat: body.eventFormat,
    registrationDeadline: body.registrationDeadline
      ? new Date(body.registrationDeadline)
      : null,
    speakers: body.speakers,
    goals: body.goals,
    agenda: body.agenda,
    startsAt: new Date(body.startsAt),
    endsAt: new Date(body.endsAt),
  });

  const hub = await loadCompanyEventsHub(getCompanyWorkspaceUserId(session));
  return NextResponse.json(hub);
}
