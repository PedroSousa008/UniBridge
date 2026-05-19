import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUniversityApi } from '@/lib/university/api-auth';
import { logUniversityActivity } from '@/lib/university/activity';

export async function GET() {
  const auth = await requireUniversityApi();
  if (auth.error) return auth.error;

  const partnerships = await prisma.companyPartnership.findMany({
    where: { universityId: auth.ctx.university.id },
    include: {
      companyUser: {
        include: { companyProfile: true },
      },
      _count: { select: { careerPaths: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json({ partnerships });
}

export async function POST(request: Request) {
  const auth = await requireUniversityApi();
  if (auth.error) return auth.error;

  const body = await request.json();
  const companyName = String(body.companyName || '').trim();
  const contactEmail = String(body.contactEmail || '').trim().toLowerCase();

  let companyUser = contactEmail
    ? await prisma.user.findUnique({
        where: { email: contactEmail },
        include: { companyProfile: true },
      })
    : null;

  if (!companyUser) {
    return NextResponse.json(
      {
        error:
          'Company account not found. The company must register on UniBridge first, or provide an existing company email.',
      },
      { status: 404 }
    );
  }

  if (companyUser.role !== 'COMPANY') {
    return NextResponse.json(
      { error: 'This email is not registered as a company account.' },
      { status: 400 }
    );
  }

  if (companyName && companyUser.companyProfile) {
    await prisma.companyProfile.update({
      where: { userId: companyUser.id },
      data: {
        companyName,
        industry: body.industry || companyUser.companyProfile.industry,
        website: body.website || companyUser.companyProfile.website,
      },
    });
  }

  const partnership = await prisma.companyPartnership.upsert({
    where: {
      universityId_companyUserId: {
        universityId: auth.ctx.university.id,
        companyUserId: companyUser.id,
      },
    },
    update: {
      status: 'ACTIVE',
      contactName: body.contactName || null,
      contactEmail: contactEmail || null,
      partnershipType: body.partnershipType || null,
    },
    create: {
      universityId: auth.ctx.university.id,
      companyUserId: companyUser.id,
      status: 'ACTIVE',
      contactName: body.contactName || null,
      contactEmail: contactEmail || null,
      partnershipType: body.partnershipType || null,
    },
  });

  await logUniversityActivity(
    auth.ctx.university.id,
    'partnership',
    `Partnership with ${companyName || companyUser.companyProfile?.companyName}`,
    'Company partnership is now active in the ecosystem.',
    '/university/career?tab=partnerships'
  );

  return NextResponse.json({ partnership }, { status: 201 });
}
