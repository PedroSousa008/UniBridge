import { Suspense } from 'react';
import { requireSession } from '@/lib/session';
import { getUniversityContext } from '@/lib/university/context';
import { prisma } from '@/lib/db';
import { UniversityInnovationClient } from './innovation-client';

export default async function UniversityInnovationPage() {
  const session = await requireSession('UNIVERSITY');
  const ctx = await getUniversityContext(session.user.id);

  const [startups, programs] = await Promise.all([
    prisma.startup.findMany({
      include: {
        founder: { select: { name: true, email: true } },
        _count: { select: { members: true } },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    ctx
      ? prisma.incubatorProgram.findMany({
          where: { universityId: ctx.university.id },
          orderBy: { createdAt: 'desc' },
        })
      : Promise.resolve([]),
  ]);

  const founderMap = new Map<string, { name: string; email: string; startups: string[] }>();
  for (const s of startups) {
    const key = s.founderId;
    const existing = founderMap.get(key);
    if (existing) {
      existing.startups.push(s.name);
    } else {
      founderMap.set(key, {
        name: s.founder.name || s.founder.email,
        email: s.founder.email,
        startups: [s.name],
      });
    }
  }

  const founders = Array.from(founderMap.entries()).map(([userId, data]) => ({
    id: userId,
    name: data.name,
    email: data.email,
    startupCount: data.startups.length,
    topStartup: data.startups[0] ?? null,
  }));

  const rankings = [...startups]
    .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
    .slice(0, 10)
    .map((s, i) => ({
      id: s.id,
      name: s.name,
      score: 100 - i * 7,
      category: s.industry || 'General',
    }));

  const studentMembers = await prisma.startupMember.findMany({
    include: {
      user: { select: { name: true, headline: true } },
      startup: { select: { name: true } },
    },
    take: 50,
  });

  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-muted/40" />}>
    <UniversityInnovationClient
      kpis={{
        totalStartups: startups.length,
        featuredStartups: startups.filter((s) => s.featured).length,
        activePrograms: programs.filter((p) => p.status === 'ACTIVE').length,
        founderCount: founders.length,
      }}
      startups={startups.map((s) => ({
        id: s.id,
        name: s.name,
        industry: s.industry,
        stage: s.stage,
        founderName: s.founder.name || s.founder.email,
        featured: s.featured,
        memberCount: s._count.members,
      }))}
      founders={founders}
      rankings={rankings}
      talent={studentMembers.map((m) => ({
        id: m.id,
        name: m.user.name || 'Member',
        skills: m.user.headline || m.role,
        startupName: m.startup.name,
      }))}
      programs={programs.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        deadline: p.deadline?.toISOString() ?? null,
        location: p.location,
      }))}
    />
    </Suspense>
  );
}
