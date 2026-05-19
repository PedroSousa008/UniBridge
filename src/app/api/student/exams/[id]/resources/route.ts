import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ensureExamTables } from '@/lib/db/ensure-exam-schema';
import { loadStudentExamsHub } from '@/lib/student/student-exams';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureExamTables();
  const { id: examId } = await params;
  const body = await request.json();
  const title = String(body.title || '').trim();
  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });

  await prisma.studentExamPersonalResource.create({
    data: {
      examId,
      studentId: session.user.id,
      title,
      kind: String(body.kind || 'notes'),
      url: body.url || null,
      content: body.content || null,
    },
  });

  const exams = await loadStudentExamsHub(session.user.id);
  return NextResponse.json({ exam: exams.find((e) => e.id === examId) });
}
