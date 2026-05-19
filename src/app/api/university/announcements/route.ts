import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
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

  const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
  const isDraft = body.saveAs === 'draft';

  const announcement = await prisma.universityAnnouncement.create({
    data: {
      universityId: auth.ctx.university.id,
      title,
      message,
      audience,
      priority: body.priority || 'normal',
      status: isDraft ? 'DRAFT' : scheduledAt ? 'SCHEDULED' : 'SENT',
      scheduledAt,
      publishedAt: !isDraft && !scheduledAt ? new Date() : null,
      createdById: auth.session.user.id,
    },
  });

  await logUniversityActivity(
    auth.ctx.university.id,
    'announcement',
    `Announcement: ${title}`,
    message.slice(0, 120),
    '/university/academics?tab=announcements'
  );

  return NextResponse.json({ announcement }, { status: 201 });
}
