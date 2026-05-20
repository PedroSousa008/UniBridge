import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/session';
import { loadOpportunityWorkspace } from '@/lib/student/student-opportunities-hub';
import { OpportunityWorkspaceClient } from '@/components/student/career/opportunity-workspace-client';

export default async function OpportunityWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession('STUDENT');
  const { id } = await params;
  const workspace = await loadOpportunityWorkspace(session.user.id, id);
  if (!workspace) notFound();

  return <OpportunityWorkspaceClient initialWorkspace={JSON.parse(JSON.stringify(workspace))} />;
}
