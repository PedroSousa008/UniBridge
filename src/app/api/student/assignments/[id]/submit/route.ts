import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ensureAssignmentTables } from '@/lib/db/ensure-assignment-schema';
import { deriveAssignmentStatus, loadStudentAssignmentsHub } from '@/lib/student/student-assignments';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureAssignmentTables();
  const { id: assignmentId } = await params;
  const body = await request.json();

  const assignment = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      subject: { enrollments: { some: { studentId: session.user.id } } },
    },
  });
  if (!assignment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const fileUrls = Array.isArray(body.fileUrls)
    ? body.fileUrls.map((u: string) => String(u)).filter(Boolean)
    : [];

  const now = new Date();
  await prisma.assignmentSubmission.upsert({
    where: { assignmentId_studentId: { assignmentId, studentId: session.user.id } },
    create: {
      assignmentId,
      studentId: session.user.id,
      content: body.content || null,
      comment: body.comment || null,
      linkUrl: body.linkUrl || null,
      fileUrls,
      submittedAt: now,
    },
    update: {
      content: body.content !== undefined ? body.content : undefined,
      comment: body.comment !== undefined ? body.comment : undefined,
      linkUrl: body.linkUrl !== undefined ? body.linkUrl : undefined,
      fileUrls: body.fileUrls !== undefined ? fileUrls : undefined,
      submittedAt: now,
    },
  });

  const status = deriveAssignmentStatus({
    dueDate: assignment.dueDate,
    submittedAt: now,
    score: null,
    progressPercent: 100,
    startedAt: now,
  });

  await prisma.studentAssignmentProgress.upsert({
    where: { assignmentId_studentId: { assignmentId, studentId: session.user.id } },
    create: {
      assignmentId,
      studentId: session.user.id,
      progressPercent: 100,
      status,
      startedAt: now,
    },
    update: { progressPercent: 100, status },
  });

  const hub = await loadStudentAssignmentsHub(session.user.id);
  return NextResponse.json({
    assignment: hub.assignments.find((a) => a.id === assignmentId),
  });
}
