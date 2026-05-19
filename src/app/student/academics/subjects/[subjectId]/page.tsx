import { redirect } from 'next/navigation';

export default async function SubjectIndexPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const { subjectId } = await params;
  redirect(`/student/academics/subjects/${subjectId}/home`);
}
