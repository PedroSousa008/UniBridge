import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateInternshipLifecycle } from '@/lib/student/student-internships-hub';
import type { InternshipLifecycleStage } from '@/lib/student/internship-job-builder';

const VALID: InternshipLifecycleStage[] = [
  'saved',
  'preparing',
  'applied',
  'interviewing',
  'offer_received',
  'accepted',
  'rejected',
  'completed',
];

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { internshipId, status } = await request.json();
  if (!internshipId || !status || !VALID.includes(status)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  try {
    const app = await updateInternshipLifecycle(session.user.id, internshipId, status);
    return NextResponse.json({ ok: true, status: app.status });
  } catch {
    return NextResponse.json({ error: 'Update failed' }, { status: 400 });
  }
}
