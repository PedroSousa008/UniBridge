import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  addPendingCvEntry,
  loadStudentCvHub,
  upsertCvSettings,
} from '@/lib/student/student-cv-hub';
import type { CvVisibility } from '@/lib/career/cv-intelligence';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const versionId = searchParams.get('version') ?? undefined;
  const visibility = searchParams.get('visibility') as CvVisibility | undefined;

  const hub = await loadStudentCvHub(session.user.id, { versionId, visibility });
  return NextResponse.json(hub);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  if (body.action === 'add_entry') {
    await addPendingCvEntry(session.user.id, {
      section: body.section ?? 'experience',
      title: String(body.title ?? '').trim(),
      subtitle: body.subtitle,
      body: body.body,
      startDate: body.startDate,
      endDate: body.endDate,
    });
  } else if (body.action === 'settings') {
    await upsertCvSettings(session.user.id, {
      visibility: body.visibility,
      activeVersion: body.versionId,
      headline: body.headline,
      summary: body.summary,
    });
  } else {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  const hub = await loadStudentCvHub(session.user.id, {
    versionId: body.versionId,
    visibility: body.visibility,
  });
  return NextResponse.json(hub);
}
