import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { loadCompanyProfileHub } from '@/lib/company/company-profile-hub';
import { requireSession } from '@/lib/session';

export async function GET() {
  const session = await requireSession('COMPANY');
  const hub = await loadCompanyProfileHub(session.user.id);
  return NextResponse.json(hub);
}

export async function PATCH(req: NextRequest) {
  const session = await requireSession('COMPANY');
  const body = (await req.json()) as Record<string, unknown>;

  if (typeof body.name === 'string') {
    await prisma.user.update({ where: { id: session.user.id }, data: { name: body.name } });
  }

  await prisma.companyProfile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      companyName: typeof body.companyName === 'string' ? body.companyName : null,
      industry: typeof body.industry === 'string' ? body.industry : null,
      website: typeof body.website === 'string' ? body.website : null,
      headquarters: typeof body.headquarters === 'string' ? body.headquarters : null,
    },
    update: {
      ...(typeof body.companyName === 'string' ? { companyName: body.companyName } : {}),
      ...(typeof body.industry === 'string' ? { industry: body.industry } : {}),
      ...(typeof body.website === 'string' ? { website: body.website } : {}),
      ...(typeof body.headquarters === 'string' ? { headquarters: body.headquarters } : {}),
    },
  });

  const hub = await loadCompanyProfileHub(session.user.id);
  return NextResponse.json(hub);
}
