import { NextResponse } from 'next/server';
import type { ExamContentKind } from '@prisma/client';
import { prisma } from '@/lib/db';
import { ensureExamTables } from '@/lib/db/ensure-exam-schema';
import { syncExamAnnouncement } from '@/lib/student/announcement-sync';
import { syncExamToCalendars } from '@/lib/student/exam-sync';
import { requireTeacherSubject } from '@/lib/teacher/subject-auth';

const KINDS = new Set<string>(['LECTURE', 'WORKSHOP', 'DOCUMENT', 'TOPIC']);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; examId: string }> }
) {
  const { subjectId, examId } = await params;
  const auth = await requireTeacherSubject(subjectId);
  if (auth.error) return auth.error;

  await ensureExamTables();

  const exam = await prisma.exam.findFirst({ where: { id: examId, subjectId } });
  if (!exam) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (exam.createdById !== auth.session.user.id) {
    return NextResponse.json({ error: 'Only the creator can edit this exam' }, { status: 403 });
  }

  const body = await request.json();
  const data: Record<string, unknown> = {};

  if (body.title !== undefined) data.title = String(body.title).trim();
  if (body.startAt !== undefined) data.date = new Date(String(body.startAt));
  if (body.endAt !== undefined) data.endAt = new Date(String(body.endAt));
  if (body.building !== undefined) data.building = body.building || null;
  if (body.room !== undefined) data.room = body.room || null;
  if (body.seatNumber !== undefined) data.seatNumber = body.seatNumber || null;
  if (body.onlineUrl !== undefined) data.onlineUrl = body.onlineUrl || null;
  if (body.professor !== undefined) data.professor = body.professor || null;
  if (body.location !== undefined) data.location = body.location || null;
  if (body.description !== undefined) data.description = body.description || null;
  if (body.classAverage !== undefined) data.classAverage = body.classAverage ? parseFloat(String(body.classAverage)) : null;
  if (body.difficulty !== undefined) data.difficulty = parseInt(String(body.difficulty), 10);
  if (body.weight !== undefined) data.weight = parseFloat(String(body.weight));
  if (body.contentVolume !== undefined) data.contentVolume = parseInt(String(body.contentVolume), 10);

  await prisma.exam.update({ where: { id: examId }, data });

  if (Array.isArray(body.includedContent)) {
    await prisma.examIncludedContent.deleteMany({ where: { examId, isOfficial: true } });
    const items = body.includedContent as { kind: string; label: string; contentItemId?: string }[];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const kind: ExamContentKind = KINDS.has(item.kind) ? (item.kind as ExamContentKind) : 'TOPIC';
      await prisma.examIncludedContent.create({
        data: {
          examId,
          kind,
          label: String(item.label),
          contentItemId: item.contentItemId || null,
          sortOrder: i,
          isOfficial: true,
          createdById: auth.session.user.id,
        },
      });
    }
  }

  if (Array.isArray(body.attachments)) {
    await prisma.examAttachment.deleteMany({ where: { examId, isOfficial: true, studentId: null } });
    for (const att of body.attachments as { title: string; url?: string; fileUrl?: string }[]) {
      if (!att.title) continue;
      await prisma.examAttachment.create({
        data: {
          examId,
          title: att.title,
          url: att.url || null,
          fileUrl: att.fileUrl || null,
          isOfficial: true,
          createdById: auth.session.user.id,
        },
      });
    }
  }

  await syncExamToCalendars(examId);
  await syncExamAnnouncement(examId);
  const updated = await prisma.exam.findUnique({
    where: { id: examId },
    include: { includedContent: true, attachments: true },
  });
  return NextResponse.json({ exam: updated });
}
