import { NextResponse } from 'next/server';
import type { AssignmentWorkflowStatus } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ensureAssignmentTables } from '@/lib/db/ensure-assignment-schema';
import { deriveAssignmentStatus, loadStudentAssignmentsHub } from '@/lib/student/student-assignments';

export async function PATCH(
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

  const existing = await prisma.studentAssignmentProgress.findUnique({
    where: { assignmentId_studentId: { assignmentId, studentId: session.user.id } },
  });

  const progressPercent =
    body.progressPercent !== undefined
      ? Math.min(100, Math.max(0, parseInt(String(body.progressPercent), 10)))
      : (existing?.progressPercent ?? 0);

  const startedAt =
    body.started === true || progressPercent > 0
      ? existing?.startedAt ?? new Date()
      : existing?.startedAt ?? null;

  const sub = await prisma.assignmentSubmission.findUnique({
    where: { assignmentId_studentId: { assignmentId, studentId: session.user.id } },
  });

  const status: AssignmentWorkflowStatus = deriveAssignmentStatus({
    dueDate: assignment.dueDate,
    submittedAt: sub?.submittedAt ?? null,
    score: sub?.score ?? null,
    progressPercent,
    startedAt,
  });

  await prisma.studentAssignmentProgress.upsert({
    where: { assignmentId_studentId: { assignmentId, studentId: session.user.id } },
    create: {
      assignmentId,
      studentId: session.user.id,
      progressPercent,
      studentWeight: body.studentWeight ? parseFloat(String(body.studentWeight)) : null,
      notes: body.notes ?? null,
      startedAt,
      status,
    },
    update: {
      progressPercent,
      studentWeight: body.studentWeight !== undefined ? parseFloat(String(body.studentWeight)) : undefined,
      notes: body.notes !== undefined ? body.notes : undefined,
      startedAt,
      status,
    },
  });

  const hub = await loadStudentAssignmentsHub(session.user.id);
  return NextResponse.json({
    assignment: hub.assignments.find((a) => a.id === assignmentId),
  });
}
