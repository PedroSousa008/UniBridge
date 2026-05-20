import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { addOpportunityReflection, loadOpportunityWorkspace } from '@/lib/student/student-opportunities-hub';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  await addOpportunityReflection(session.user.id, id, {
    title: String(body.title ?? 'Interview reflection'),
    content: String(body.content ?? ''),
  });

  const workspace = await loadOpportunityWorkspace(session.user.id, id);
  return NextResponse.json({ workspace });
}
