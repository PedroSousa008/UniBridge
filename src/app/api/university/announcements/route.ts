import { NextResponse } from 'next/server';
import type { AnnouncementCategory, AnnouncementPriority } from '@prisma/client';
import { prisma } from '@/lib/db';
import { ensureAnnouncementTables } from '@/lib/db/ensure-announcements-schema';
import { broadcastUniversityAnnouncement } from '@/lib/student/announcement-sync';
import { requireUniversityApi } from '@/lib/university/api-auth';
import { logUniversityActivity } from '@/lib/university/activity';

export async function POST(request: Request) {
  const auth = await requireUniversityApi();
  if (auth.error) return auth.error;

  const body = await request.json();
  const title = String(body.title || '').trim();
  const message = String(body.message || '').trim();
  const audience = String(body.audience || 'all').trim();

  if (!title || !message) {
    return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
  }

  await ensureAnnouncementTables();

  const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
  const isDraft = body.saveAs === 'draft';
  const priorityLevel = (body.priorityLevel as AnnouncementPriority) || 'IMPORTANT';
  const category = (body.category as AnnouncementCategory) || 'UNIVERSITY_WIDE';

  const announcement = await prisma.universityAnnouncement.create({
    data: {
      universityId: auth.ctx.university.id,
      title,
      message,
      preview: message.slice(0, 200),
      audience,
      audienceFilter: body.audienceFilter ?? undefined,
      priority: priorityLevel === 'URGENT' || priorityLevel === 'CRITICAL' ? 'high' : 'normal',
      priorityLevel,
      category,
      linkHref: body.linkHref ? String(body.linkHref) : '/student/academics/announcements',
      linkLabel: body.linkLabel ? String(body.linkLabel) : 'View Announcement',
      pinned: !!body.pinned || priorityLevel === 'CRITICAL',
      attachments: body.attachments ?? undefined,
      taggedUserIds: Array.isArray(body.taggedUserIds) ? body.taggedUserIds.map(String) : [],
      pushNotify: body.pushNotify !== false,
      status: isDraft ? 'DRAFT' : scheduledAt ? 'SCHEDULED' : 'SENT',
      scheduledAt,
      publishedAt: !isDraft && !scheduledAt ? new Date() : null,
      createdById: auth.session.user.id,
    },
  });

  if (!isDraft && !scheduledAt) {
    await broadcastUniversityAnnouncement(announcement.id);
  }

  await logUniversityActivity(
    auth.ctx.university.id,
    'announcement',
    `Announcement: ${title}`,
    message.slice(0, 120),
    '/university/academics?tab=announcements'
  );

  return NextResponse.json({ announcement }, { status: 201 });
}
