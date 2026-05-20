import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadPartnershipCompanyDetail } from '@/lib/student/student-partnerships-hub';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const detail = await loadPartnershipCompanyDetail(session.user.id, id);
  if (!detail) {
    return NextResponse.json({ error: 'Partnership not found' }, { status: 404 });
  }

  return NextResponse.json(detail);
}
