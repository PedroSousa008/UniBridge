import { NextRequest, NextResponse } from 'next/server';
import { changeUserPassword } from '@/lib/company/company-workspace';
import { requireCompanyWorkspace } from '@/lib/session';

export async function POST(req: NextRequest) {
  const { session } = await requireCompanyWorkspace();
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
