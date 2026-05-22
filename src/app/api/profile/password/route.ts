import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { changeUserPassword } from '@/lib/auth/password';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json()) as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!body.currentPassword || !body.newPassword) {
    return NextResponse.json({ error: 'Current and new password required' }, { status: 400 });
  }

  const result = await changeUserPassword(
    session.user.id,
    body.currentPassword,
    body.newPassword
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? 'Failed' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
