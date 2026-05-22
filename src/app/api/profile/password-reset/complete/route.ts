import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { completePasswordReset } from '@/lib/auth/password-reset';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json()) as { newPassword?: string; confirmPassword?: string };
  if (!body.newPassword || body.newPassword !== body.confirmPassword) {
    return NextResponse.json({ error: 'Passwords must match' }, { status: 400 });
  }

  const result = await completePasswordReset(session.user.id, body.newPassword);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, message: 'Password updated. Use it on your next login.' });
}
