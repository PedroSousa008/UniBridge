import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { StartupProfileView } from '@/components/startup/startup-profile-view';

export default async function StartupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession('STUDENT');
  const { id } = await params;

  const startup = await prisma.startup.findUnique({
    where: { id },
    include: {
      founder: { select: { id: true, name: true, email: true } },
      members: {
        include: { user: { select: { id: true, name: true, image: true } } },
      },
      media: { orderBy: { sortOrder: 'asc' } },
      milestones: { orderBy: { sortOrder: 'asc' } },
      tractionMetrics: true,
      openings: true,
    },
  });

  if (!startup) notFound();

  const isMember =
    startup.founderId === session.user.id ||
    startup.members.some((m) => m.userId === session.user.id);

  return (
    <StartupProfileView
      currentUserId={session.user.id}
      startup={{
        id: startup.id,
        name: startup.name,
        tagline: startup.tagline,
        logoUrl: startup.logoUrl,
        coverUrl: startup.coverUrl,
        industry: startup.industry,
        stage: startup.stage,
        website: startup.website,
        readinessScore: startup.readinessScore,
        progressPercent: startup.progressPercent,
        problem: startup.problem,
        solution: startup.solution,
        targetCustomer: startup.targetCustomer,
        visionOneLiner: startup.visionOneLiner,
        canEdit: startup.founderId === session.user.id,
        isMember,
        founder: startup.founder,
        members: startup.members.map((m) => ({
          id: m.id,
          role: m.role,
          isMainFounder: m.isMainFounder,
          user: m.user,
        })),
        media: startup.media,
        milestones: startup.milestones.map((m) => ({
          label: m.label,
          status: m.status,
        })),
        openings: startup.openings,
        tractionPublic: startup.tractionMetrics
          .filter((t) => !t.isPrivate && t.value)
          .map((t) => ({ label: t.label, value: t.value! })),
      }}
    />
  );
}
