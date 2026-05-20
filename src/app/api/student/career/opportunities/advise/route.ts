import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  loadStudentOpportunitiesHub,
  runOpportunityAdvisorFromHub,
} from '@/lib/student/student-opportunities-hub';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const hub = await loadStudentOpportunitiesHub(session.user.id);
  const reply = runOpportunityAdvisorFromHub(String(body.prompt ?? ''), hub);
  return NextResponse.json({ reply });
}
