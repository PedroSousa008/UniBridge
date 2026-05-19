import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUniversityApi } from '@/lib/university/api-auth';
import { logUniversityActivity } from '@/lib/university/activity';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUniversityApi();
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const action = body.action as 'approve' | 'publish' | 'reject';

  const path = await prisma.careerPath.findFirst({
    where: { id, universityId: auth.ctx.university.id },
  });

  if (!path) {
    return NextResponse.json({ error: 'Career path not found' }, { status: 404 });
  }

  let status = path.status;
  let publishedAt = path.publishedAt;

  if (action === 'approve') status = 'APPROVED';
  if (action === 'publish') {
    status = 'PUBLISHED';
    publishedAt = new Date();
  }
  if (action === 'reject') status = 'REJECTED';

  const updated = await prisma.careerPath.update({
    where: { id },
    data: { status, publishedAt, universityId: auth.ctx.university.id },
  });

  await logUniversityActivity(
    auth.ctx.university.id,
    'career_path',
    `Career path ${action}: ${path.roleTitle}`,
    `${path.companyName} — ${path.roleTitle}`,
    '/university/career?tab=paths'
  );

  return NextResponse.json({ careerPath: updated });
}
