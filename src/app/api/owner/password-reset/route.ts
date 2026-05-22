import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  approvePasswordReset,
  listPendingPasswordResets,
  rejectPasswordReset,
} from '@/lib/auth/password-reset';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const requests = await listPendingPasswordResets();
  return NextResponse.json({ requests });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const requestId = String(body.requestId || '');
  const action = body.action === 'approve' ? 'approve' : body.action === 'reject' ? 'reject' : null;

  if (!requestId || !action) {
    return NextResponse.json({ error: 'requestId and action required' }, { status: 400 });
  }

  const result =
    action === 'approve'
      ? await approvePasswordReset(requestId, session.user.id)
      : await rejectPasswordReset(requestId, session.user.id);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const requests = await listPendingPasswordResets();
  return NextResponse.json({ ok: true, requests });
}
