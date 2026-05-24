import { NextResponse } from 'next/server';
import { requireUniversityApi } from '@/lib/university/api-auth';
import { prisma } from '@/lib/db';
import {
  getSubjectGradingPlan,
  setSubjectFinalExamReplacementRule,
} from '@/lib/teacher/teacher-gradebook';
import { recalculateSubjectFinalGrades } from '@/lib/teacher/final-grade-calculator';

async function getOwnedSubject(universityId: string, id: string) {
  return prisma.subject.findFirst({
    where: {
      id,
      OR: [{ universityId }, { course: { universityId } }],
    },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUniversityApi();
  if (auth.error) return auth.error;

  const { id } = await params;
  const subject = await getOwnedSubject(auth.ctx.university.id, id);
  if (!subject) {
    return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
  }

  const plan = await getSubjectGradingPlan(id);
  return NextResponse.json({ plan });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUniversityApi();
  if (auth.error) return auth.error;

  const { id } = await params;
  const subject = await getOwnedSubject(auth.ctx.university.id, id);
  if (!subject) {
    return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
  }

  const body = await request.json();
  if (body.finalExamReplacementRule === undefined) {
    return NextResponse.json({ error: 'finalExamReplacementRule required' }, { status: 400 });
  }

  const result = await setSubjectFinalExamReplacementRule(id, !!body.finalExamReplacementRule);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await recalculateSubjectFinalGrades(id);

  const plan = await getSubjectGradingPlan(id);
  return NextResponse.json({ plan });
}
