import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ensureAssignmentTables } from '@/lib/db/ensure-assignment-schema';
import { loadStudentAssignmentsHub } from '@/lib/student/student-assignments';

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
  const action = String(body.action || '');

  const assignment = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      isGroup: true,
      subject: { enrollments: { some: { studentId: session.user.id } } },
    },
    include: { groups: { include: { members: true } } },
  });
  if (!assignment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let group = assignment.groups.find((g) =>
    g.members.some((m) => m.studentId === session.user.id)
  );

  if (!group) {
    group = await prisma.assignmentGroup.create({
      data: {
        assignmentId,
        name: body.groupName || 'My group',
        members: { create: { studentId: session.user.id, role: 'lead' } },
      },
      include: { members: true },
    });
  }

  if (action === 'comment' && body.body) {
    await prisma.assignmentGroupComment.create({
      data: { groupId: group.id, studentId: session.user.id, body: String(body.body) },
    });
  }

  if (action === 'task' && body.title) {
    await prisma.assignmentGroupTask.create({
      data: {
        groupId: group.id,
        title: String(body.title),
        assigneeId: body.assigneeId || null,
      },
    });
  }

  if (action === 'toggle_task' && body.taskId) {
    const task = await prisma.assignmentGroupTask.findFirst({
      where: { id: body.taskId, groupId: group.id },
    });
    if (task) {
      await prisma.assignmentGroupTask.update({
        where: { id: task.id },
        data: { done: !task.done },
      });
    }
  }

  if (action === 'file' && body.title) {
    await prisma.assignmentGroupFile.create({
      data: {
        groupId: group.id,
        studentId: session.user.id,
        title: String(body.title),
        url: body.url || null,
      },
    });
  }

  const hub = await loadStudentAssignmentsHub(session.user.id);
  return NextResponse.json({
    assignment: hub.assignments.find((a) => a.id === assignmentId),
  });
}
