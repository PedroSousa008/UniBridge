import { Suspense } from 'react';
import { requireSession } from '@/lib/session';
import { loadTeacherWorkspaceHub } from '@/lib/teacher/teacher-workspace-hub';
import { TeacherWorkspaceCommandCenter } from '@/components/teacher/teacher-workspace-command-center';

async function WorkspaceContent() {
  const session = await requireSession('TEACHER');
  const hub = await loadTeacherWorkspaceHub(session.user.id);
  return <TeacherWorkspaceCommandCenter initialHub={JSON.parse(JSON.stringify(hub))} />;
}

export default function TeacherWorkspacePage() {
  return (
    <Suspense fallback={null}>
      <WorkspaceContent />
    </Suspense>
  );
}
