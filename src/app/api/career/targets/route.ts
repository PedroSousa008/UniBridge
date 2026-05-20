import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

const PROFILE_INSIGHT_LABEL = 'Profile insight';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const targets = await prisma.careerTarget.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json({ targets });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const roleTitle = String(body.roleTitle || '').trim();
  const profileInsightId = body.profileInsightId ? String(body.profileInsightId) : null;
  const isProfileInsight = body.isProfileInsight === true || !!profileInsightId;
  const companyName = isProfileInsight
    ? PROFILE_INSIGHT_LABEL
    : String(body.companyName || '').trim() || null;
  const careerPathId =
    body.careerPathId &&
    !String(body.careerPathId).startsWith('archetype-')
      ? String(body.careerPathId)
      : null;
  const compatibility = body.compatibility != null ? Number(body.compatibility) : 0;
  const missingRequirements =
    body.missingRequirements != null ? JSON.stringify(body.missingRequirements) : null;

  if (!roleTitle) {
    return NextResponse.json({ error: 'Role title is required' }, { status: 400 });
  }

  let existing = null;
  if (careerPathId) {
    existing = await prisma.careerTarget.findFirst({
      where: { userId: session.user.id, careerPathId },
    });
  } else if (isProfileInsight) {
    existing = await prisma.careerTarget.findFirst({
      where: {
        userId: session.user.id,
        roleTitle,
        careerPathId: null,
        OR: [{ companyName: PROFILE_INSIGHT_LABEL }, { companyName: null }],
      },
    });
  } else {
    existing = await prisma.careerTarget.findFirst({
      where: { userId: session.user.id, roleTitle, companyName },
    });
  }

  if (existing) {
    const updated = await prisma.careerTarget.update({
      where: { id: existing.id },
      data: {
        compatibility,
        missingRequirements,
        companyName: isProfileInsight ? PROFILE_INSIGHT_LABEL : companyName,
        isPrimary: body.setPrimary === true ? true : existing.isPrimary,
      },
    });
    if (body.setPrimary === true) {
      await prisma.careerTarget.updateMany({
        where: { userId: session.user.id, id: { not: existing.id } },
        data: { isPrimary: false },
      });
    }
    return NextResponse.json({ target: updated, action: 'updated' });
  }

  const count = await prisma.careerTarget.count({
    where: { userId: session.user.id },
  });

  const target = await prisma.careerTarget.create({
    data: {
      userId: session.user.id,
      roleTitle,
      companyName,
      careerPathId,
      compatibility,
      missingRequirements,
      isPrimary: body.setPrimary === true || count === 0,
    },
  });

  if (body.setPrimary === true) {
    await prisma.careerTarget.updateMany({
      where: { userId: session.user.id, id: { not: target.id } },
      data: { isPrimary: false },
    });
  }

  return NextResponse.json({ target, action: 'created' }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const targetId = String(body.targetId || '');
  if (!targetId) {
    return NextResponse.json({ error: 'targetId required' }, { status: 400 });
  }

  const target = await prisma.careerTarget.findFirst({
    where: { id: targetId, userId: session.user.id },
  });
  if (!target) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (body.setPrimary === true) {
    await prisma.careerTarget.updateMany({
      where: { userId: session.user.id },
      data: { isPrimary: false },
    });
  }

  const updated = await prisma.careerTarget.update({
    where: { id: targetId },
    data: {
      isPrimary: body.setPrimary === true ? true : body.isPrimary ?? target.isPrimary,
    },
  });

  return NextResponse.json({ target: updated });
}
