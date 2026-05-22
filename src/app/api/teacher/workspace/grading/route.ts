import { NextRequest, NextResponse } from 'next/server';
import { saveTeacherSubmissionGrade } from '@/lib/teacher/teacher-grading';
import { requireSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  const session = await requireSession('TEACHER');
  const body = (await req.json()) as {
    submissionId?: string;
    draftScore?: number | null;
    teacherFeedback?: string | null;
    publish?: boolean;
  };

  if (!body.submissionId) {
    return NextResponse.json({ error: 'submissionId required' }, { status: 400 });
  }

  const result = await saveTeacherSubmissionGrade({
    submissionId: body.submissionId,
    teacherUserId: session.user.id,
    draftScore: body.draftScore,
    teacherFeedback: body.teacherFeedback,
    publish: body.publish,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
