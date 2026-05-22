import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPasswordResetStatus } from '@/lib/auth/password-reset';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const status = await getPasswordResetStatus(session.user.id);
  return NextResponse.json(status);
}
