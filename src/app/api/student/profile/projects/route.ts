import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ensureProfileIdentityTables } from '@/lib/db/ensure-profile-identity-schema';
import { loadStudentProfileHub } from '@/lib/student/student-profile-hub';
import { requireSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  const session = await requireSession('STUDENT');
  const dbReady = await ensureProfileIdentityTables();
  if (!dbReady) {
    return NextResponse.json({ error: 'Profile storage not ready' }, { status: 503 });
  }

  const body = (await req.json()) as {
    title?: string;
    description?: string;
    linkUrl?: string;
    fileUrl?: string;
    tags?: string[];
  };

  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'Title required' }, { status: 400 });
  }

  const studentRow = await prisma.studentProfile.findUnique({ where: { userId: session.user.id } });
  if (!studentRow) {
    return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
  }

  await prisma.studentProfileProject.create({
    data: {
      studentProfileId: studentRow.id,
      title: body.title.trim(),
      description: body.description ?? null,
      linkUrl: body.linkUrl ?? null,
      fileUrl: body.fileUrl ?? null,
      tags: body.tags ?? [],
    },
  });

  const hub = await loadStudentProfileHub(session.user.id);
  return NextResponse.json(hub);
}
