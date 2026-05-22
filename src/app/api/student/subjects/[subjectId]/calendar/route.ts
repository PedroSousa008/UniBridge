import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { loadSubjectCalendarHub } from '@/lib/teacher/subject-calendar-hub';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { subjectId } = await params;
  const enrollment = await prisma.subjectEnrollment.findUnique({
    where: { subjectId_studentId: { subjectId, studentId: session.user.id } },
    include: { subject: { select: { status: true } } },
  });
  if (!enrollment?.subject || enrollment.subject.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
  }

  const hub = await loadSubjectCalendarHub(subjectId, { editable: false });
  return NextResponse.json(hub);
}
