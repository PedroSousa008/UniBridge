import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ensureResourceTables } from '@/lib/db/ensure-resources-schema';
import {
  DEFAULT_RESOURCE_PREFS,
  incrementResourceSaveCount,
  type ResourcePreferences,
} from '@/lib/student/student-resources';

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ready = await ensureResourceTables();
  if (!ready) {
    return NextResponse.json({ error: 'RESOURCES_DB_NOT_READY' }, { status: 503 });
  }

  const body = await request.json();
  const prefs: ResourcePreferences = {
    savedIds: Array.isArray(body.savedIds) ? body.savedIds.map(String) : DEFAULT_RESOURCE_PREFS.savedIds,
    pinnedIds: Array.isArray(body.pinnedIds) ? body.pinnedIds.map(String) : DEFAULT_RESOURCE_PREFS.pinnedIds,
    favoriteIds: Array.isArray(body.favoriteIds)
      ? body.favoriteIds.map(String)
      : DEFAULT_RESOURCE_PREFS.favoriteIds,
    quickLists: Array.isArray(body.quickLists) ? body.quickLists : DEFAULT_RESOURCE_PREFS.quickLists,
  };

  await prisma.studentResourcePreference.upsert({
    where: { studentId: session.user.id },
    create: { studentId: session.user.id, ...prefs },
    update: prefs,
  });

  return NextResponse.json({ preferences: prefs });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const resourceId = String(body.resourceId || '');
  const action = body.action as 'save' | 'unsave' | 'pin' | 'unpin' | 'favorite' | 'unfavorite';

  if (!resourceId || !action) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const ready = await ensureResourceTables();
  if (!ready) {
    return NextResponse.json({ error: 'RESOURCES_DB_NOT_READY' }, { status: 503 });
  }

  const row = await prisma.studentResourcePreference.findUnique({
    where: { studentId: session.user.id },
  });

  const prefs: ResourcePreferences = row
    ? {
        savedIds: row.savedIds ?? [],
        pinnedIds: row.pinnedIds ?? [],
        favoriteIds: row.favoriteIds ?? [],
        quickLists: (row.quickLists as ResourcePreferences['quickLists']) ?? DEFAULT_RESOURCE_PREFS.quickLists,
      }
    : { ...DEFAULT_RESOURCE_PREFS };

  const toggle = (list: string[], add: boolean) =>
    add ? [...new Set([...list, resourceId])] : list.filter((id) => id !== resourceId);

  if (action === 'save') {
    prefs.savedIds = toggle(prefs.savedIds, true);
    await incrementResourceSaveCount(resourceId);
  } else if (action === 'unsave') prefs.savedIds = toggle(prefs.savedIds, false);
  else if (action === 'pin') prefs.pinnedIds = toggle(prefs.pinnedIds, true);
  else if (action === 'unpin') prefs.pinnedIds = toggle(prefs.pinnedIds, false);
  else if (action === 'favorite') prefs.favoriteIds = toggle(prefs.favoriteIds, true);
  else if (action === 'unfavorite') prefs.favoriteIds = toggle(prefs.favoriteIds, false);

  await prisma.studentResourcePreference.upsert({
    where: { studentId: session.user.id },
    create: { studentId: session.user.id, ...prefs },
    update: prefs,
  });

  return NextResponse.json({ preferences: prefs });
}
