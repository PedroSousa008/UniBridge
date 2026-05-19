import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ensureDocumentTables } from '@/lib/db/ensure-documents-schema';

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ready = await ensureDocumentTables();
  if (!ready) {
    return NextResponse.json({ error: 'Documents storage not ready', code: 'DOCUMENTS_DB_NOT_READY' }, { status: 503 });
  }

  const body = await request.json();

  const prefs = await prisma.studentDocumentPreference.upsert({
    where: { studentId: session.user.id },
    create: {
      studentId: session.user.id,
      hideCompletedSubjects: !!body.hideCompletedSubjects,
      pinnedIds: Array.isArray(body.pinnedIds) ? body.pinnedIds : [],
      starredIds: Array.isArray(body.starredIds) ? body.starredIds : [],
      archivedSubjectIds: Array.isArray(body.archivedSubjectIds) ? body.archivedSubjectIds : [],
      offlineSavedIds: Array.isArray(body.offlineSavedIds) ? body.offlineSavedIds : [],
      recentOpens: body.recentOpens ?? [],
    },
    update: {
      hideCompletedSubjects:
        body.hideCompletedSubjects !== undefined ? !!body.hideCompletedSubjects : undefined,
      pinnedIds: Array.isArray(body.pinnedIds) ? body.pinnedIds : undefined,
      starredIds: Array.isArray(body.starredIds) ? body.starredIds : undefined,
      archivedSubjectIds: Array.isArray(body.archivedSubjectIds)
        ? body.archivedSubjectIds
        : undefined,
      offlineSavedIds: Array.isArray(body.offlineSavedIds) ? body.offlineSavedIds : undefined,
      recentOpens: body.recentOpens !== undefined ? body.recentOpens : undefined,
    },
  });

  return NextResponse.json({ preferences: prefs });
}
