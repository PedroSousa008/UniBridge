import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadStudentOpportunitiesHub } from '@/lib/student/student-opportunities-hub';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const compare = searchParams.get('compare')?.split(',').filter(Boolean);

  const hub = await loadStudentOpportunitiesHub(session.user.id, { compareIds: compare });
  return NextResponse.json(hub);
}
