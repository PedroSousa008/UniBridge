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
  const action = body.action as 'feature' | 'unfeature' | 'view';

  const startup = await prisma.startup.findUnique({ where: { id } });
  if (!startup) {
    return NextResponse.json({ error: 'Startup not found' }, { status: 404 });
  }

  if (action === 'view') {
    await logUniversityActivity(
      auth.ctx.university.id,
      'startup',
      `Viewed startup: ${startup.name}`,
      startup.tagline || undefined,
      `/university/innovation?tab=startups`
    );
    return NextResponse.json({ startup });
  }

  const featured = action === 'feature';
  const updated = await prisma.startup.update({
    where: { id },
    data: { featured },
  });

  await logUniversityActivity(
    auth.ctx.university.id,
    'startup',
    featured ? `Featured: ${startup.name}` : `Unfeatured: ${startup.name}`,
    undefined,
    '/university/innovation?tab=startups'
  );

  return NextResponse.json({ startup: updated });
}
