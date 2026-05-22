import { redirect } from 'next/navigation';

export default async function TeacherSubjectIndexPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const { subjectId } = await params;
  redirect(`/teacher/classes/${subjectId}/home`);
}
