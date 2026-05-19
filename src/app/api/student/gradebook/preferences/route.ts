import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ensureGradebookTables } from '@/lib/db/ensure-gradebook-schema';
import { DEFAULT_THRESHOLDS } from '@/lib/student/gradebook-engine';

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ready = await ensureGradebookTables();
  if (!ready) {
    return NextResponse.json({ error: 'Gradebook storage not ready', code: 'GRADEBOOK_DB_NOT_READY' }, { status: 503 });
  }

  const body = await request.json();

  const prefs = await prisma.studentGradebookPreference.upsert({
    where: { studentId: session.user.id },
    create: {
      studentId: session.user.id,
      goodMin: body.goodMin ?? DEFAULT_THRESHOLDS.goodMin,
      moderateMin: body.moderateMin ?? DEFAULT_THRESHOLDS.moderateMin,
      passMin: body.passMin ?? DEFAULT_THRESHOLDS.passMin,
      targetGpa: body.targetGpa ?? null,
      creditsCompleted: body.creditsCompleted ?? 0,
      creditsRequired: body.creditsRequired ?? 180,
      ectsPerSubject: body.ectsPerSubject ?? 6,
    },
    update: {
      goodMin: body.goodMin !== undefined ? parseFloat(String(body.goodMin)) : undefined,
      moderateMin: body.moderateMin !== undefined ? parseFloat(String(body.moderateMin)) : undefined,
      passMin: body.passMin !== undefined ? parseFloat(String(body.passMin)) : undefined,
      targetGpa: body.targetGpa !== undefined ? (body.targetGpa ? parseFloat(String(body.targetGpa)) : null) : undefined,
      creditsCompleted: body.creditsCompleted !== undefined ? parseInt(String(body.creditsCompleted), 10) : undefined,
      creditsRequired: body.creditsRequired !== undefined ? parseInt(String(body.creditsRequired), 10) : undefined,
      ectsPerSubject: body.ectsPerSubject !== undefined ? parseInt(String(body.ectsPerSubject), 10) : undefined,
    },
  });

  return NextResponse.json({ preferences: prefs });
}
