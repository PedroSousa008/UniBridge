import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ensureAssignmentTables } from '@/lib/db/ensure-assignment-schema';
import { syncAssignmentAnnouncement } from '@/lib/student/announcement-sync';
import { syncAssignmentToCalendars } from '@/lib/student/assignment-sync';
import { requireTeacherSubject } from '@/lib/teacher/subject-auth';

export async function PATCH(
  request: Request,
  {
    params,
  }: { params: Promise<{ subjectId: string; assignmentId: string }> }
) {
  const { subjectId, assignmentId } = await params;
  const auth = await requireTeacherSubject(subjectId);
  if (auth.error) return auth.error;

  await ensureAssignmentTables();

  const existing = await prisma.assignment.findFirst({
    where: { id: assignmentId, subjectId },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json();
  const data: Record<string, unknown> = {};

  if (body.title !== undefined) data.title = String(body.title).trim();
  if (body.description !== undefined) data.description = body.description || null;
  if (body.instructions !== undefined) data.instructions = body.instructions || null;
  if (body.rubric !== undefined) data.rubric = body.rubric || null;
  if (body.dueDate !== undefined) data.dueDate = new Date(String(body.dueDate));
  if (body.maxScore !== undefined) data.maxScore = parseFloat(String(body.maxScore));
  if (body.weightPercent !== undefined) data.weightPercent = parseFloat(String(body.weightPercent));
  if (body.isGroup !== undefined) data.isGroup = !!body.isGroup;
  if (body.gradeCategoryId !== undefined) data.gradeCategoryId = body.gradeCategoryId || null;
  if (body.allowedFormats !== undefined) data.allowedFormats = body.allowedFormats;
  if (body.linksJson !== undefined) data.linksJson = body.linksJson;

  await prisma.assignment.update({ where: { id: assignmentId }, data });

  if (Array.isArray(body.attachments)) {
    await prisma.assignmentAttachment.deleteMany({ where: { assignmentId } });
    for (const att of body.attachments as { title: string; url?: string; fileUrl?: string; kind?: string }[]) {
      if (!att.title) continue;
      await prisma.assignmentAttachment.create({
        data: {
          assignmentId,
          title: att.title,
          url: att.url || null,
          fileUrl: att.fileUrl || null,
          kind: att.kind || 'file',
          createdById: auth.session.user.id,
        },
      });
    }
  }

  await syncAssignmentToCalendars(assignmentId);
  await syncAssignmentAnnouncement(assignmentId);
  const updated = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { attachments: true },
  });
  return NextResponse.json({ assignment: updated });
}
