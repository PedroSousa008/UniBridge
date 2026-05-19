import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ensureStudentCalendarTables } from '@/lib/db/ensure-calendar-schema';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureStudentCalendarTables();
  const pref = await prisma.studentCalendarPreference.findUnique({
    where: { studentId: session.user.id },
  });

  return NextResponse.json({ preferences: pref });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureStudentCalendarTables();
  const body = await request.json();

  const pref = await prisma.studentCalendarPreference.upsert({
    where: { studentId: session.user.id },
    create: {
      studentId: session.user.id,
      countdownMinutes: body.countdownMinutes ?? [10080, 4320, 1440, 720, 120],
      layersEnabled: body.layersEnabled ?? null,
      googleSyncEnabled: !!body.googleSyncEnabled,
      appleSyncEnabled: !!body.appleSyncEnabled,
    },
    update: {
      countdownMinutes: body.countdownMinutes,
      layersEnabled: body.layersEnabled,
      googleSyncEnabled: body.googleSyncEnabled,
      appleSyncEnabled: body.appleSyncEnabled,
    },
  });

  return NextResponse.json({ preferences: pref });
}
