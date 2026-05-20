import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { loadCompanyStartupsHub } from '@/lib/company/company-startups-hub';
import { requireSession } from '@/lib/session';

export async function GET() {
  const session = await requireSession('COMPANY');
  const hub = await loadCompanyStartupsHub(session.user.id);
  return NextResponse.json(hub);
}

export async function POST(req: NextRequest) {
  const session = await requireSession('COMPANY');
  const body = (await req.json()) as { startupId?: string; action?: 'follow' | 'bookmark' };

  if (!body.startupId || !body.action) {
    return NextResponse.json({ error: 'startupId and action required' }, { status: 400 });
  }

  if (body.action === 'follow') {
    await prisma.startupFollower.upsert({
      where: { startupId_userId: { startupId: body.startupId, userId: session.user.id } },
      create: { startupId: body.startupId, userId: session.user.id },
      update: {},
    });
  } else if (body.action === 'bookmark') {
    await prisma.startupBookmark.upsert({
      where: { startupId_userId: { startupId: body.startupId, userId: session.user.id } },
      create: { startupId: body.startupId, userId: session.user.id },
      update: {},
    });
  }

  const hub = await loadCompanyStartupsHub(session.user.id);
  return NextResponse.json(hub);
}
