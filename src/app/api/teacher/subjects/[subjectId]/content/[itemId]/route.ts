import { ContentItemType } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  announcementSourceRef,
  removeAutoAnnouncement,
  syncDocumentAnnouncement,
} from '@/lib/student/announcement-sync';
import { requireTeacherSubject } from '@/lib/teacher/subject-auth';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; itemId: string }> }
) {
  const { subjectId, itemId } = await params;
  const auth = await requireTeacherSubject(subjectId);
  if (auth.error) return auth.error;

  const existing = await prisma.subjectContentItem.findFirst({
    where: { id: itemId, week: { subjectId } },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Content not found' }, { status: 404 });
  }

  const body = await request.json();
  const title = body.title != null ? String(body.title).trim() : undefined;
  const typeRaw = body.type != null ? String(body.type).toUpperCase() : undefined;
  const contentType =
    typeRaw && (Object.values(ContentItemType) as string[]).includes(typeRaw)
      ? (typeRaw as ContentItemType)
      : undefined;
  const url = body.url !== undefined ? (body.url ? String(body.url) : null) : undefined;
  const fileUrl = body.fileUrl !== undefined ? (body.fileUrl ? String(body.fileUrl) : null) : undefined;
  const description =
    body.description !== undefined ? (body.description ? String(body.description) : null) : undefined;

  const item = await prisma.subjectContentItem.update({
    where: { id: itemId },
    data: {
      ...(title ? { title } : {}),
      ...(contentType ? { type: contentType } : {}),
      ...(url !== undefined ? { url } : {}),
      ...(fileUrl !== undefined ? { fileUrl } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(body.examPriority !== undefined ? { examPriority: !!body.examPriority } : {}),
    },
  });

  await syncDocumentAnnouncement(item.id);

  return NextResponse.json({ item });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ subjectId: string; itemId: string }> }
) {
  const { subjectId, itemId } = await params;
  const auth = await requireTeacherSubject(subjectId);
  if (auth.error) return auth.error;

  const existing = await prisma.subjectContentItem.findFirst({
    where: { id: itemId, week: { subjectId } },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Content not found' }, { status: 404 });
  }

  await removeAutoAnnouncement(announcementSourceRef('document', itemId));
  await prisma.subjectContentItem.delete({ where: { id: itemId } });

  return NextResponse.json({ ok: true });
}
