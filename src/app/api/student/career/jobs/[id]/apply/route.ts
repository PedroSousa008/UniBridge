import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { applyToJob } from '@/lib/student/student-partnerships-hub';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const result = await applyToJob(session.user.id, id);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Could not submit application' }, { status: 400 });
  }
}
