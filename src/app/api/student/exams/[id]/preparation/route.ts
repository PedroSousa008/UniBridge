import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ensureExamTables } from '@/lib/db/ensure-exam-schema';
import { loadStudentExamsHub } from '@/lib/student/student-exams';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ready = await ensureExamTables();
  if (!ready) {
    return NextResponse.json({ error: 'Exams storage not ready', code: 'EXAMS_DB_NOT_READY' }, { status: 503 });
  }

  const { id: examId } = await params;
  const body = await request.json();

  const exam = await prisma.exam.findFirst({
    where: {
      id: examId,
      OR: [
        { ownerStudentId: session.user.id },
        { subject: { enrollments: { some: { studentId: session.user.id } } } },
      ],
    },
    include: { includedContent: true },
  });
  if (!exam) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const existing = await prisma.studentExamPreparation.findUnique({
    where: { examId_studentId: { examId, studentId: session.user.id } },
  });

  const checklist =
    body.checklist !== undefined
      ? (body.checklist as Record<string, boolean>)
      : ((existing?.checklist as Record<string, boolean>) ?? {});

  let lecturesDone = 0;
  let workshopsDone = 0;
  let documentsDone = 0;
  let revisionsDone = 0;
  let done = 0;
  for (const item of exam.includedContent) {
    if (!checklist[item.id]) continue;
    done++;
    if (item.kind === 'LECTURE') lecturesDone++;
    else if (item.kind === 'WORKSHOP') workshopsDone++;
    else if (item.kind === 'DOCUMENT') documentsDone++;
    else revisionsDone++;
  }
  const total = exam.includedContent.length || 1;
  const prepPercent = exam.includedContent.length ? Math.round((done / total) * 100) : 0;

  await prisma.studentExamPreparation.upsert({
    where: { examId_studentId: { examId, studentId: session.user.id } },
    create: {
      examId,
      studentId: session.user.id,
      checklist,
      prepPercent,
      lecturesDone,
      workshopsDone,
      documentsDone,
      revisionsDone,
      personalNotes: body.personalNotes ?? null,
    },
    update: {
      checklist,
      prepPercent,
      lecturesDone,
      workshopsDone,
      documentsDone,
      revisionsDone: body.revisionsDone ?? revisionsDone,
      personalNotes: body.personalNotes !== undefined ? body.personalNotes : undefined,
    },
  });

  const exams = await loadStudentExamsHub(session.user.id);
  return NextResponse.json({ exam: exams.find((e) => e.id === examId) });
}
