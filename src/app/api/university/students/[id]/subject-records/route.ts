import { NextResponse } from 'next/server';
import { requireUniversityApi } from '@/lib/university/api-auth';
import { logUniversityActivity } from '@/lib/university/activity';
import {
  loadUniversityStudentAcademicProfile,
  updateStudentSubjectRecord,
} from '@/lib/university/student-academic-profile-hub';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUniversityApi();
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const subjectId = String(body.subjectId ?? '').trim();
  if (!subjectId) {
    return NextResponse.json({ error: 'subjectId required' }, { status: 400 });
  }

  const grade =
    body.grade !== undefined && body.grade !== '' && body.grade != null
      ? parseFloat(String(body.grade))
      : body.grade === null || body.grade === ''
        ? null
        : undefined;

  if (grade !== undefined && grade != null && Number.isNaN(grade)) {
    return NextResponse.json({ error: 'Invalid grade' }, { status: 400 });
  }

  const profile = await updateStudentSubjectRecord(auth.ctx.university.id, id, subjectId, {
    grade,
    completionStatus:
      body.completionStatus !== undefined ? body.completionStatus || null : undefined,
    adminNotes: body.adminNotes !== undefined ? body.adminNotes || null : undefined,
  });

  if (!profile) {
    return NextResponse.json({ error: 'Student or subject not found' }, { status: 404 });
  }

  await logUniversityActivity(
    auth.ctx.university.id,
    'student',
    `Subject record updated for ${profile.student.name}`,
    undefined,
    '/university/academics?tab=students'
  );

  return NextResponse.json({ profile });
}
