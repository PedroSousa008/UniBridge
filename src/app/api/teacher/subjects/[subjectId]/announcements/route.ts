import { NextResponse } from 'next/server';
import type { AnnouncementCategory, AnnouncementPriority } from '@prisma/client';
import { prisma } from '@/lib/db';
import { ensureAnnouncementTables } from '@/lib/db/ensure-announcements-schema';
import { pushAnnouncementNotifications } from '@/lib/student/announcement-sync';
import { requireTeacherSubject } from '@/lib/teacher/subject-auth';

const PRIORITIES: AnnouncementPriority[] = [
  'INFORMATIONAL',
  'IMPORTANT',
  'URGENT',
  'CRITICAL',
];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const auth = await requireTeacherSubject(subjectId);
  if (auth.error) return auth.error;

  await ensureAnnouncementTables();

  const body = await request.json();
  const title = String(body.title || '').trim();
  const text = String(body.body || '').trim();
  if (!title || !text) {
    return NextResponse.json({ error: 'Title and body required' }, { status: 400 });
  }

  const priorityLevel = PRIORITIES.includes(body.priorityLevel)
    ? body.priorityLevel
    : body.priority === 'high'
      ? 'URGENT'
      : 'INFORMATIONAL';

  const category = (body.category as AnnouncementCategory) || 'ACADEMIC';
  const linkHref = body.linkHref ? String(body.linkHref) : null;
  const linkLabel = body.linkLabel ? String(body.linkLabel) : null;

  const announcement = await prisma.subjectAnnouncement.create({
    data: {
      subjectId,
      authorId: auth.session.user.id,
      title,
      body: text,
      preview: text.slice(0, 200),
      priority: priorityLevel === 'URGENT' || priorityLevel === 'CRITICAL' ? 'high' : 'normal',
      priorityLevel,
      category,
      linkHref,
      linkLabel,
      pinned: !!body.pinned || priorityLevel === 'CRITICAL',
      attachments: body.attachments ?? undefined,
      taggedUserIds: Array.isArray(body.taggedUserIds) ? body.taggedUserIds.map(String) : [],
      taggedGroupIds: Array.isArray(body.taggedGroupIds) ? body.taggedGroupIds.map(String) : [],
      pushNotify: body.pushNotify !== false,
      publishedAt: new Date(),
    },
  });

  if (announcement.pushNotify) {
    const enrollments = await prisma.subjectEnrollment.findMany({
      where: { subjectId },
      select: { studentId: true },
    });
    let targets = enrollments.map((e) => e.studentId);
    if (announcement.taggedUserIds.length > 0) {
      targets = targets.filter((id) => announcement.taggedUserIds.includes(id));
    }
    await pushAnnouncementNotifications(targets, {
      title: announcement.title,
      message: announcement.preview ?? announcement.body.slice(0, 120),
      link: linkHref ?? `/student/academics/announcements?subject=${subjectId}`,
      priorityLevel,
    });
  }

  return NextResponse.json({ announcement }, { status: 201 });
}
