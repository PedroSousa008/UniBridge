import { requireSession } from '@/lib/session';
import { loadGradebookHubSerialized } from '@/lib/student/load-gradebook-hub';
import { GradebookCommandCenter } from '@/components/student/gradebook/gradebook-command-center';

export default async function StudentGradebookPage() {
  const session = await requireSession('STUDENT');
  const hub = await loadGradebookHubSerialized(session.user.id);

  return <GradebookCommandCenter initialHub={hub} />;
}
