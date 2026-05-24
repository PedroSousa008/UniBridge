import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ensureAssignmentTables } from '@/lib/db/ensure-assignment-schema';
import { syncAssignmentAnnouncement } from '@/lib/student/announcement-sync';
import { syncAssignmentToCalendars } from '@/lib/student/assignment-sync';
import { requireTeacherSubject } from '@/lib/teacher/subject-auth';
export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const auth = await requireTeacherSubject(subjectId);
  if (auth.error) return auth.error;

  const body = await request.json();
  const title = String(body.title || '').trim();
  if (!title) {
    return NextResponse.json({ error: 'Title required' }, { status: 400 });
  }

  await ensureAssignmentTables();

  const dueDate = body.dueDate ? new Date(String(body.dueDate)) : new Date();
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: { teacher: { include: { user: { select: { name: true } } } } },
  });

  const assignment = await prisma.assignment.create({
    data: {
      subjectId,
      createdById: auth.session.user.id,
      title,
      description: body.description || null,
      instructions: body.instructions || body.description || null,
      rubric: body.rubric || null,
      dueDate,
      maxScore: body.maxScore ? parseFloat(String(body.maxScore)) : 100,
      weightPercent: body.weightPercent ? parseFloat(String(body.weightPercent)) : null,
      gradeCategoryId: body.gradeCategoryId || null,
      isGroup: !!body.isGroup,
      allowedFormats: Array.isArray(body.allowedFormats) ? body.allowedFormats : [],
      linksJson: body.linksJson ?? null,
      professor: body.professor || subject?.teacher?.user?.name || null,
    },
  });

  if (Array.isArray(body.attachments)) {
    for (const att of body.attachments as { title: string; url?: string; fileUrl?: string; kind?: string }[]) {
      if (!att.title) continue;
      await prisma.assignmentAttachment.create({
        data: {
          assignmentId: assignment.id,
          title: att.title,
          url: att.url || null,
          fileUrl: att.fileUrl || null,
          kind: att.kind || 'file',
          createdById: auth.session.user.id,
        },
      });
    }
  }

  await syncAssignmentToCalendars(assignment.id);
  await syncAssignmentAnnouncement(assignment.id);

  return NextResponse.json({ assignment }, { status: 201 });
}
