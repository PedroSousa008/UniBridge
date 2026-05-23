import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ensureTeacherStudentsSchema } from '@/lib/db/ensure-teacher-students-schema';
import { requireTeacherSubject } from '@/lib/teacher/subject-auth';

function newId() {
  return `tcg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const auth = await requireTeacherSubject(subjectId);
  if (auth.error) return auth.error;
  await ensureTeacherStudentsSchema();

  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId: auth.session.user.id },
  });
  if (!teacher) {
    return NextResponse.json({ error: 'Teacher profile required' }, { status: 403 });
  }

  const body = await request.json();
  const name = String(body.name || '').trim();
  const notes = body.notes != null ? String(body.notes).trim() : null;
  const memberIds = Array.isArray(body.memberIds)
    ? body.memberIds.map((id: unknown) => String(id))
    : [];

  if (!name) {
    return NextResponse.json({ error: 'Group name required' }, { status: 400 });
  }

  const groupId = newId();
  await prisma.$executeRaw`
    INSERT INTO "TeacherClassGroup" ("id", "subjectId", "teacherId", "name", "notes", "updatedAt")
    VALUES (${groupId}, ${subjectId}, ${teacher.id}, ${name}, ${notes}, CURRENT_TIMESTAMP)
  `;

  for (const studentId of memberIds) {
    const memberId = newId();
    await prisma.$executeRaw`
      INSERT INTO "TeacherClassGroupMember" ("id", "groupId", "studentId")
      VALUES (${memberId}, ${groupId}, ${studentId})
      ON CONFLICT DO NOTHING
    `;
  }

  return NextResponse.json({
    group: { id: groupId, name, notes, memberIds },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const auth = await requireTeacherSubject(subjectId);
  if (auth.error) return auth.error;
  await ensureTeacherStudentsSchema();

  const body = await request.json();
  const groupId = String(body.groupId || '');
  const name = body.name != null ? String(body.name).trim() : undefined;
  const notes = body.notes !== undefined ? String(body.notes ?? '').trim() : undefined;
  const memberIds = Array.isArray(body.memberIds)
    ? body.memberIds.map((id: unknown) => String(id))
    : undefined;

  if (!groupId) {
    return NextResponse.json({ error: 'Group id required' }, { status: 400 });
  }

  if (name) {
    await prisma.$executeRaw`
      UPDATE "TeacherClassGroup" SET "name" = ${name}, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${groupId} AND "subjectId" = ${subjectId}
    `;
  }
  if (notes !== undefined) {
    await prisma.$executeRaw`
      UPDATE "TeacherClassGroup" SET "notes" = ${notes || null}, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${groupId} AND "subjectId" = ${subjectId}
    `;
  }

  if (memberIds) {
    await prisma.$executeRaw`
      DELETE FROM "TeacherClassGroupMember" WHERE "groupId" = ${groupId}
    `;
    for (const studentId of memberIds) {
      const memberId = newId();
      await prisma.$executeRaw`
        INSERT INTO "TeacherClassGroupMember" ("id", "groupId", "studentId")
        VALUES (${memberId}, ${groupId}, ${studentId})
      `;
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const auth = await requireTeacherSubject(subjectId);
  if (auth.error) return auth.error;

  const groupId = new URL(request.url).searchParams.get('groupId');
  if (!groupId) {
    return NextResponse.json({ error: 'groupId required' }, { status: 400 });
  }

  await prisma.$executeRaw`
    DELETE FROM "TeacherClassGroupMember" WHERE "groupId" = ${groupId}
  `;
  await prisma.$executeRaw`
    DELETE FROM "TeacherClassGroup" WHERE "id" = ${groupId} AND "subjectId" = ${subjectId}
  `;

  return NextResponse.json({ ok: true });
}
