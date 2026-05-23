import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/session';
import { loadTeacherStudentAcademicProfile } from '@/lib/teacher/teacher-student-profile-hub';
import { TeacherStudentAcademicProfile } from '@/components/teacher/teacher-student-academic-profile';

export default async function TeacherStudentProfilePage({
  params,
}: {
  params: Promise<{ subjectId: string; studentId: string }>;
}) {
  const session = await requireSession('TEACHER');
  const { subjectId, studentId } = await params;
  const profile = await loadTeacherStudentAcademicProfile(
    session.user.id,
    subjectId,
    studentId
  );
  if (!profile) notFound();

  return (
    <TeacherStudentAcademicProfile
      profile={JSON.parse(JSON.stringify(profile))}
      subjectId={subjectId}
    />
  );
}
