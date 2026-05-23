import { requireSession } from '@/lib/session';
import { loadStudentSubjectCareerData } from '@/lib/student/subject-context';
import { serializeJson } from '@/lib/student/serialize-workspace';
import { SubjectCareerPanel } from '@/components/student/subject/subject-panels';

export default async function SubjectCareerPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const session = await requireSession('STUDENT');
  const { subjectId } = await params;
  const { internships, challenges, careerPaths } = serializeJson(
    await loadStudentSubjectCareerData(session.user.id, subjectId)
  );
  return (
    <SubjectCareerPanel
      internships={internships}
      challenges={challenges}
      careerPaths={careerPaths}
    />
  );
}
