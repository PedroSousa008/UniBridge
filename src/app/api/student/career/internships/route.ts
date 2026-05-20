import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadStudentInternshipsHub } from '@/lib/student/student-internships-hub';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hub = await loadStudentInternshipsHub(session.user.id);
  return NextResponse.json(hub);
}
