import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ensureStudentCalendarTables } from '@/lib/db/ensure-calendar-schema';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureStudentCalendarTables();
  const { sourceType, sourceId } = await request.json();
  if (!sourceType || !sourceId) {
    return NextResponse.json({ error: 'sourceType and sourceId required' }, { status: 400 });
  }

  await prisma.studentCalendarHidden.upsert({
    where: {
      studentId_sourceType_sourceId: {
        studentId: session.user.id,
        sourceType: String(sourceType),
        sourceId: String(sourceId),
      },
    },
    create: {
      studentId: session.user.id,
      sourceType: String(sourceType),
      sourceId: String(sourceId),
    },
    update: {},
  });

  return NextResponse.json({ ok: true });
}
