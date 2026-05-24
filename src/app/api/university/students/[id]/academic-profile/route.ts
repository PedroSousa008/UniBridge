import { NextResponse } from 'next/server';
import { requireUniversityApi } from '@/lib/university/api-auth';
import { logUniversityActivity } from '@/lib/university/activity';
import {
  loadUniversityStudentAcademicProfile,
  updateUniversityStudentAcademicProfileMeta,
} from '@/lib/university/student-academic-profile-hub';
import { normalizeSubjectSemester } from '@/lib/academics/subject-semester';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUniversityApi();
  if (auth.error) return auth.error;

  const { id } = await params;
  const profile = await loadUniversityStudentAcademicProfile(auth.ctx.university.id, id);
  if (!profile) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  return NextResponse.json({ profile });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUniversityApi();
  if (auth.error) return auth.error;

  const { id } = await params;
  const existing = await loadUniversityStudentAcademicProfile(auth.ctx.university.id, id);
  if (!existing) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  const body = await request.json();

  const yearOfStudy =
    body.yearOfStudy !== undefined
      ? body.yearOfStudy
        ? parseInt(String(body.yearOfStudy), 10)
        : null
      : undefined;

  const profile = await updateUniversityStudentAcademicProfileMeta(
    auth.ctx.university.id,
    id,
    {
      studentNumber:
        body.studentNumber !== undefined ? String(body.studentNumber).trim() || null : undefined,
      academicStatus:
        body.academicStatus !== undefined ? String(body.academicStatus).trim() || null : undefined,
      currentSemester:
        body.currentSemester !== undefined
          ? normalizeSubjectSemester(String(body.currentSemester)) ||
            String(body.currentSemester).trim() ||
            null
          : undefined,
      scholarshipStatus:
        body.scholarshipStatus !== undefined
          ? String(body.scholarshipStatus).trim() || null
          : undefined,
      personalEmail:
        body.personalEmail !== undefined ? String(body.personalEmail).trim() || null : undefined,
      emergencyContact:
        body.emergencyContact !== undefined
          ? String(body.emergencyContact).trim() || null
          : undefined,
      yearOfStudy:
        yearOfStudy !== undefined
          ? yearOfStudy && !Number.isNaN(yearOfStudy)
            ? yearOfStudy
            : null
          : undefined,
      program:
        body.program !== undefined
          ? body.program
            ? String(body.program).trim()
            : null
          : undefined,
    }
  );

  await logUniversityActivity(
    auth.ctx.university.id,
    'student',
    `Academic profile updated: ${existing.student.name}`,
    undefined,
    '/university/academics?tab=students'
  );

  return NextResponse.json({ profile });
}
