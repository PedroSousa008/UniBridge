import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { mapStartupToBuilder } from '@/lib/startups/map-builder';
import { StartupBuilder } from '@/components/startup/startup-builder';

export default async function EditStartupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession('STUDENT');
  const { id } = await params;

  const startup = await prisma.startup.findFirst({
    where: { id, founderId: session.user.id },
    include: {
      members: {
        include: { user: { select: { name: true, email: true } } },
      },
      media: { orderBy: { sortOrder: 'asc' } },
      milestones: { orderBy: { sortOrder: 'asc' } },
      tractionMetrics: true,
      openings: true,
    },
  });

  if (!startup) notFound();

  const initial = mapStartupToBuilder(startup);

  return <StartupBuilder startupId={id} initial={initial} />;
}
