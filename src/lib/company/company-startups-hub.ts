import { prisma } from '@/lib/db';
import { buildCompanyCandidateCard } from '@/lib/company/company-candidate-builder';

export interface CompanyStartupRow {
  id: string;
  name: string;
  tagline: string | null;
  industry: string | null;
  stage: string | null;
  universityName: string | null;
  founderName: string;
  founderUserId: string;
  teamSize: number;
  readinessScore: number;
  followers: number;
  isFollowed: boolean;
  isBookmarked: boolean;
  traction: string | null;
  website: string | null;
  href: string;
  founderCard: Awaited<ReturnType<typeof buildCompanyCandidateCard>>;
}

export interface CompanyStartupsHub {
  startups: CompanyStartupRow[];
  analytics: {
    total: number;
    followed: number;
    trending: { name: string; followers: number }[];
    topIndustries: { industry: string; count: number }[];
  };
  dbReady: boolean;
  serverTime: string;
}

export async function loadCompanyStartupsHub(companyUserId: string): Promise<CompanyStartupsHub> {
  const partnerships = await prisma.companyPartnership.findMany({
    where: { companyUserId, status: 'ACTIVE' },
    select: { universityId: true },
  });
  const uniIds = partnerships.map((p) => p.universityId).filter(Boolean) as string[];

  const where =
    uniIds.length > 0
      ? { OR: [{ universityId: { in: uniIds } }, { featured: true }] }
      : { featured: true };

  const rows = await prisma.startup.findMany({
    where,
    include: {
      founder: { select: { id: true, name: true } },
      members: true,
      followers: { where: { userId: companyUserId } },
      bookmarks: { where: { userId: companyUserId } },
      _count: { select: { followers: true } },
    },
    orderBy: [{ readinessScore: 'desc' }, { updatedAt: 'desc' }],
    take: 40,
  });

  const rowUniIds = [...new Set(rows.map((s) => s.universityId).filter(Boolean))] as string[];
  const unis =
    rowUniIds.length > 0
      ? await prisma.university.findMany({ where: { id: { in: rowUniIds } }, select: { id: true, name: true } })
      : [];
  const uniMap = new Map(unis.map((u) => [u.id, u.name]));

  const startups: CompanyStartupRow[] = [];

  for (const s of rows) {
    const founderCard = await buildCompanyCandidateCard(s.founderId, companyUserId);
    startups.push({
      id: s.id,
      name: s.name,
      tagline: s.tagline,
      industry: s.industry,
      stage: s.stage,
      universityName: s.universityId ? (uniMap.get(s.universityId) ?? null) : null,
      founderName: s.founder.name ?? 'Founder',
      founderUserId: s.founderId,
      teamSize: s.members.length,
      readinessScore: Math.round(s.readinessScore),
      followers: s._count.followers,
      isFollowed: s.followers.length > 0,
      isBookmarked: s.bookmarks.length > 0,
      traction: s.traction,
      website: s.website,
      href: `/student/startup/${s.id}`,
      founderCard,
    });
  }

  const industryMap = new Map<string, number>();
  for (const s of startups) {
    const ind = s.industry ?? 'Other';
    industryMap.set(ind, (industryMap.get(ind) ?? 0) + 1);
  }

  return {
    startups,
    analytics: {
      total: startups.length,
      followed: startups.filter((s) => s.isFollowed).length,
      trending: [...startups]
        .sort((a, b) => b.followers - a.followers)
        .slice(0, 5)
        .map((s) => ({ name: s.name, followers: s.followers })),
      topIndustries: [...industryMap.entries()]
        .map(([industry, count]) => ({ industry, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    },
    dbReady: true,
    serverTime: new Date().toISOString(),
  };
}
