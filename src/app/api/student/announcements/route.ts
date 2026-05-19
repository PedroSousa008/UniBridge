import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import type { AnnouncementCategory, AnnouncementPriority } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import {
  loadStudentAnnouncementsHub,
  type AnnouncementFilters,
} from '@/lib/student/student-announcements';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filters: AnnouncementFilters = {
    subjectId: searchParams.get('subjectId') || undefined,
    category: (searchParams.get('category') as AnnouncementCategory) || undefined,
    priorityLevel: (searchParams.get('priority') as AnnouncementPriority) || undefined,
    professor: searchParams.get('professor') || undefined,
    unreadOnly: searchParams.get('unreadOnly') === 'true',
    since: searchParams.get('since') || undefined,
  };

  const hub = await loadStudentAnnouncementsHub(session.user.id, filters);
  return NextResponse.json(JSON.parse(JSON.stringify(hub)));
}
