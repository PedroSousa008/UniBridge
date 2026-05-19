import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { getUniversityContext } from './context';

export async function requireUniversityApi() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'UNIVERSITY') {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const ctx = await getUniversityContext(session.user.id);
  if (!ctx) {
    return { error: NextResponse.json({ error: 'University not found' }, { status: 404 }) };
  }

  return { session, ctx };
}
