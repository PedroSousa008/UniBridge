import { prisma } from '@/lib/db';
import { buildCompanyCandidateCard } from '@/lib/company/company-candidate-builder';
import {
  analyzeStartupPotential,
  buildActivityFeedFromStartup,
  buildHealthMetrics,
  buildInterestSignals,
  computeEcosystemScore,
  computeTrendingScore,
  normalizeStageLabel,
  resolveStartupWebsiteUrl,
  STARTUP_CATEGORY_CHIPS,
  type AiPotentialAnalysis,
  type StartupActivityEvent,
  type StartupHealthMetrics,
} from '@/lib/company/company-startups-intelligence';

export { STARTUP_CATEGORY_CHIPS };
export type { StartupActivityEvent };

export interface StartupFounderSummary {
  userId: string;
  name: string;
  image: string | null;
  universityName: string | null;
  program: string | null;
  role: string;
  isMainFounder: boolean;
  leadershipScore: number | null;
}

export interface StartupOpeningRow {
  id: string;
  role: string;
  description: string | null;
  skillsRequired: string[];
  timeCommitment: string | null;
  compensation: string | null;
}

export interface CompanyStartupCard {
  id: string;
  name: string;
  tagline: string | null;
  logoUrl: string | null;
  industry: string | null;
  category: string;
  stage: string;
  stageLabel: string;
  universityName: string | null;
  universityId: string | null;
  founders: StartupFounderSummary[];
  teamSize: number;
  readinessScore: number;
  progressPercent: number;
  followers: number;
  followersGainedWeek: number;
  growthPercent: number;
  momentumScore: number;
  isFollowed: boolean;
  isBookmarked: boolean;
  websiteUrl: string | null;
  href: string;
  ai: AiPotentialAnalysis;
  health: StartupHealthMetrics;
  interestSignals: string[];
  openings: StartupOpeningRow[];
  ecosystemScore: number;
  trendingScore: number;
  profileViewsEst: number;
  fundingStatus: string | null;
}

export interface UniversityStartupRanking {
  universityId: string;
  name: string;
  startupCount: number;
  activeFounders: number;
  showcaseActive: boolean;
}

export interface CompanyStartupsEcosystemHub {
  companyName: string;
  heroTitle: string;
  heroMetrics: { id: string; label: string; value: string | number; hint?: string }[];
  hasPartnerships: boolean;
  partnerUniversityIds: string[];
  bestOfMonth: CompanyStartupCard[];
  highestPotential: CompanyStartupCard[];
  trending: CompanyStartupCard[];
  futureUnicorn: CompanyStartupCard[];
  discover: CompanyStartupCard[];
  activityFeed: StartupActivityEvent[];
  universityRankings: UniversityStartupRanking[];
  rankingsActivated: boolean;
  filters: {
    categories: string[];
    stages: string[];
    universities: { id: string; name: string }[];
  };
  analytics: {
    total: number;
    followed: number;
    saved: number;
  };
  serverTime: string;
}

export interface CompanyStartupDetail {
  card: CompanyStartupCard;
  description: string | null;
  problem: string | null;
  solution: string | null;
  targetCustomer: string | null;
  differentiator: string | null;
  businessModelText: string | null;
  traction: string | null;
  founderCard: Awaited<ReturnType<typeof buildCompanyCandidateCard>>;
  mediaCount: number;
  milestones: { label: string; status: string }[];
}

type StartupRow = Awaited<ReturnType<typeof loadPartnerStartups>>[0];

function weekAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d;
}

async function loadPartnerStartups(companyUserId: string, uniIds: string[]) {
  const where =
    uniIds.length > 0
      ? { universityId: { in: uniIds } }
      : { id: '__none__' };

  if (uniIds.length === 0) return [];

  return prisma.startup.findMany({
    where,
    include: {
      founder: {
        select: {
          id: true,
          name: true,
          image: true,
          studentProfile: {
            select: {
              university: { select: { id: true, name: true } },
              course: { select: { name: true } },
              profileStrength: true,
              employabilityScore: true,
            },
          },
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              studentProfile: {
                select: {
                  university: { select: { name: true } },
                  course: { select: { name: true } },
                  profileStrength: true,
                },
              },
            },
          },
        },
      },
      milestones: true,
      openings: true,
      followers: { where: { userId: companyUserId } },
      bookmarks: { where: { userId: companyUserId } },
      _count: { select: { followers: true, bookmarks: true, members: true, openings: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 80,
  });
}

async function followerCountsThisWeek(startupIds: string[]) {
  if (startupIds.length === 0) return new Map<string, number>();
  const since = weekAgo();
  const rows = await prisma.startupFollower.groupBy({
    by: ['startupId'],
    where: { startupId: { in: startupIds }, createdAt: { gte: since } },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.startupId, r._count._all]));
}

async function bookmarkCountsThisWeek(startupIds: string[]) {
  if (startupIds.length === 0) return new Map<string, number>();
  const since = weekAgo();
  const rows = await prisma.startupBookmark.groupBy({
    by: ['startupId'],
    where: { startupId: { in: startupIds }, createdAt: { gte: since } },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.startupId, r._count._all]));
}

function mapFounders(s: StartupRow): StartupFounderSummary[] {
  return s.members.map((m) => ({
    userId: m.user.id,
    name: m.user.name ?? 'Founder',
    image: m.user.image,
    universityName: m.user.studentProfile?.university?.name ?? null,
    program: m.user.studentProfile?.course?.name ?? null,
    role: m.role,
    isMainFounder: m.isMainFounder,
    leadershipScore: m.user.studentProfile?.profileStrength ?? null,
  }));
}

function buildCard(
  s: StartupRow,
  uniMap: Map<string, string>,
  companyUserId: string,
  followersWeek: number,
  bookmarksWeek: number
): CompanyStartupCard {
  const founders = mapFounders(s);
  const main = founders.find((f) => f.isMainFounder) ?? founders[0];
  const milestoneDone = s.milestones.filter((m) => m.status === 'done').length;
  const milestoneTotal = s.milestones.length || 1;
  const founderStrength = s.founder.studentProfile?.profileStrength ?? 50;
  const founderEmployability = s.founder.studentProfile?.employabilityScore ?? 50;
  const profileViewsEst = Math.max(
    s._count.followers * 3 + s._count.bookmarks * 5,
    12
  );

  const ai = analyzeStartupPotential({
    name: s.name,
    problem: s.problem,
    targetCustomer: s.targetCustomer,
    solution: s.solution,
    differentiator: s.differentiator,
    businessModelText: s.businessModelText,
    targetMarket: s.targetMarket,
    marketSizeEstimate: s.marketSizeEstimate,
    competitors: s.competitors,
    stage: s.stage,
    industry: s.industry,
    revenueModels: s.revenueModels ?? [],
    readinessScore: s.readinessScore,
    progressPercent: s.progressPercent,
    teamSize: s._count.members,
    followerCount: s._count.followers,
    milestoneDone,
    milestoneTotal,
    founderProfileStrength: founderStrength,
    founderEmployability,
  });

  const ecosystemScore = computeEcosystemScore({
    followers: s._count.followers,
    followersThisWeek: followersWeek,
    bookmarks: s._count.bookmarks,
    companyBookmarks: s.bookmarks.length,
    readinessScore: s.readinessScore,
    progressPercent: s.progressPercent,
    milestoneDone,
    teamSize: s._count.members,
    founderStrength,
    updatedAt: s.updatedAt,
  });

  const trendingScore = computeTrendingScore({
    followersThisWeek: followersWeek,
    profileViewsEst,
    bookmarksThisWeek: bookmarksWeek,
    openings: s._count.openings,
    founderNetworking: founderStrength,
    progressDelta: s.progressPercent,
  });

  const growthPercent =
    followersWeek > 0
      ? Math.min(99, Math.round((followersWeek / Math.max(1, s._count.followers)) * 100))
      : Math.round(s.progressPercent * 0.4);

  const health = buildHealthMetrics({
    teamSize: s._count.members,
    milestoneDone,
    milestoneTotal,
    progressPercent: s.progressPercent,
    followerCount: s._count.followers,
    openings: s._count.openings,
    founderStrength,
    founderNetworking: founderStrength,
    updatedRecently: Date.now() - s.updatedAt.getTime() < 14 * 86400000,
  });

  const industry = s.industry ?? 'Innovation';
  const category = STARTUP_CATEGORY_CHIPS.find((c) =>
    industry.toLowerCase().includes(c.toLowerCase())
  )
    ? industry
    : industry;

  return {
    id: s.id,
    name: s.name,
    tagline: s.tagline,
    logoUrl: s.logoUrl,
    industry,
    category,
    stage: s.stage ?? 'idea',
    stageLabel: normalizeStageLabel(s.stage),
    universityName: s.universityId ? uniMap.get(s.universityId) ?? null : main?.universityName ?? null,
    universityId: s.universityId,
    founders,
    teamSize: s._count.members,
    readinessScore: Math.round(s.readinessScore),
    progressPercent: s.progressPercent,
    followers: s._count.followers,
    followersGainedWeek: followersWeek,
    growthPercent,
    momentumScore: ai.momentumScore,
    isFollowed: s.followers.length > 0,
    isBookmarked: s.bookmarks.length > 0,
    websiteUrl: resolveStartupWebsiteUrl(s.website),
    href: `/student/startup/${s.id}`,
    ai,
    health,
    interestSignals: buildInterestSignals({
      companyBookmarkCount: s._count.bookmarks,
      companyFollowed: s.followers.length > 0,
      totalBookmarks: s._count.bookmarks,
      totalFollowers: s._count.followers,
      openings: s._count.openings,
      mentorInterestEst: Math.min(3, s._count.openings),
    }),
    openings: s.openings.map((o) => ({
      id: o.id,
      role: o.role,
      description: o.description,
      skillsRequired: o.skillsRequired ?? [],
      timeCommitment: o.timeCommitment,
      compensation: o.compensation,
    })),
    ecosystemScore,
    trendingScore,
    profileViewsEst,
    fundingStatus: s.monetizationStage ?? null,
  };
}

export async function loadCompanyStartupsEcosystemHub(
  companyUserId: string
): Promise<CompanyStartupsEcosystemHub> {
  const [companyProfile, partnerships] = await Promise.all([
    prisma.companyProfile.findUnique({
      where: { userId: companyUserId },
      select: { companyName: true },
    }),
    prisma.companyPartnership.findMany({
      where: { companyUserId, status: 'ACTIVE' },
      include: { university: { select: { id: true, name: true } } },
    }),
  ]);

  const uniIds = partnerships.map((p) => p.universityId);
  const uniMap = new Map(partnerships.map((p) => [p.universityId, p.university.name]));
  const rows = await loadPartnerStartups(companyUserId, uniIds);
  const ids = rows.map((r) => r.id);
  const [followersWeekMap, bookmarksWeekMap] = await Promise.all([
    followerCountsThisWeek(ids),
    bookmarkCountsThisWeek(ids),
  ]);

  const cards = rows.map((s) =>
    buildCard(
      s,
      uniMap,
      companyUserId,
      followersWeekMap.get(s.id) ?? 0,
      bookmarksWeekMap.get(s.id) ?? 0
    )
  );

  const bestOfMonth = [...cards]
    .sort((a, b) => b.ecosystemScore - a.ecosystemScore)
    .slice(0, 8);

  const highestPotential = [...cards]
    .sort((a, b) => b.ai.momentumScore - a.ai.momentumScore)
    .slice(0, 6);

  const trending = [...cards]
    .sort((a, b) => b.trendingScore - a.trendingScore)
    .slice(0, 8);

  const futureUnicorn = [...cards]
    .filter((c) => c.ai.unicornSignals.length >= 2)
    .sort((a, b) => b.ai.momentumScore - a.ai.momentumScore)
    .slice(0, 6);

  const followedIds = new Set(cards.filter((c) => c.isFollowed || c.isBookmarked).map((c) => c.id));
  const since = weekAgo();
  const activityFeed: StartupActivityEvent[] = [];
  for (const s of rows.filter((r) => followedIds.has(r.id))) {
    activityFeed.push(
      ...buildActivityFeedFromStartup(
        {
          id: s.id,
          name: s.name,
          updatedAt: s.updatedAt,
          milestones: s.milestones.map((m) => ({
            label: m.label,
            status: m.status,
            date: m.date,
          })),
          members: s.members.map((m) => ({
            createdAt: m.createdAt,
            user: { name: m.user.name },
          })),
          openings: s.openings.map((o) => ({ createdAt: o.createdAt, role: o.role })),
        },
        since
      )
    );
  }
  activityFeed.sort((a, b) => b.at.localeCompare(a.at));

  const uniCounts = new Map<string, { count: number; founders: Set<string> }>();
  for (const s of rows) {
    if (!s.universityId) continue;
    const cur = uniCounts.get(s.universityId) ?? { count: 0, founders: new Set() };
    cur.count += 1;
    cur.founders.add(s.founderId);
    uniCounts.set(s.universityId, cur);
  }

  const universityRankings: UniversityStartupRanking[] = partnerships
    .map((p) => {
      const stats = uniCounts.get(p.universityId);
      return {
        universityId: p.universityId,
        name: p.university.name,
        startupCount: stats?.count ?? 0,
        activeFounders: stats?.founders.size ?? 0,
        showcaseActive: (stats?.count ?? 0) >= 2,
      };
    })
    .filter((u) => u.showcaseActive)
    .sort((a, b) => b.startupCount - a.startupCount);

  const companyName = companyProfile?.companyName ?? 'Your company';

  return {
    companyName,
    heroTitle: 'Discover the future before everyone else',
    heroMetrics: [
      { id: 'startups', label: 'Partner ventures', value: cards.length },
      { id: 'followed', label: 'You follow', value: cards.filter((c) => c.isFollowed).length },
      { id: 'hiring', label: 'Actively recruiting', value: cards.filter((c) => c.openings.length > 0).length },
      {
        id: 'momentum',
        label: 'Avg AI momentum',
        value: cards.length
          ? Math.round(cards.reduce((s, c) => s + c.momentumScore, 0) / cards.length)
          : '—',
      },
    ],
    hasPartnerships: partnerships.length > 0,
    partnerUniversityIds: uniIds,
    bestOfMonth,
    highestPotential,
    trending,
    futureUnicorn,
    discover: cards,
    activityFeed: activityFeed.slice(0, 20),
    universityRankings,
    rankingsActivated: universityRankings.length > 0,
    filters: {
      categories: [...STARTUP_CATEGORY_CHIPS],
      stages: ['Idea', 'MVP', 'Beta', 'Growing', 'Revenue Generating', 'Scaling'],
      universities: partnerships.map((p) => ({ id: p.universityId, name: p.university.name })),
    },
    analytics: {
      total: cards.length,
      followed: cards.filter((c) => c.isFollowed).length,
      saved: cards.filter((c) => c.isBookmarked).length,
    },
    serverTime: new Date().toISOString(),
  };
}

export async function loadCompanyStartupDetail(
  companyUserId: string,
  startupId: string
): Promise<CompanyStartupDetail | null> {
  const partnerships = await prisma.companyPartnership.findMany({
    where: { companyUserId, status: 'ACTIVE' },
    select: { universityId: true },
  });
  const uniIds = partnerships.map((p) => p.universityId);

  const s = await prisma.startup.findFirst({
    where: {
      id: startupId,
      ...(uniIds.length > 0 ? { universityId: { in: uniIds } } : {}),
    },
    include: {
      founder: {
        select: {
          id: true,
          name: true,
          image: true,
          studentProfile: {
            select: {
              university: { select: { id: true, name: true } },
              course: { select: { name: true } },
              profileStrength: true,
              employabilityScore: true,
            },
          },
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              studentProfile: {
                select: {
                  university: { select: { name: true } },
                  course: { select: { name: true } },
                  profileStrength: true,
                },
              },
            },
          },
        },
      },
      milestones: true,
      openings: true,
      media: true,
      followers: { where: { userId: companyUserId } },
      bookmarks: { where: { userId: companyUserId } },
      _count: { select: { followers: true, bookmarks: true, members: true, openings: true } },
    },
  });
  if (!s) return null;

  const uniMap = new Map(
    partnerships.length
      ? (
          await prisma.university.findMany({
            where: { id: { in: uniIds } },
            select: { id: true, name: true },
          })
        ).map((u) => [u.id, u.name])
      : []
  );

  const [followersWeekMap, bookmarksWeekMap, founderCard] = await Promise.all([
    followerCountsThisWeek([s.id]),
    bookmarkCountsThisWeek([s.id]),
    buildCompanyCandidateCard(s.founderId, companyUserId),
  ]);

  const card = buildCard(
    s as StartupRow,
    uniMap,
    companyUserId,
    followersWeekMap.get(s.id) ?? 0,
    bookmarksWeekMap.get(s.id) ?? 0
  );

  return {
    card,
    description: s.description,
    problem: s.problem,
    solution: s.solution,
    targetCustomer: s.targetCustomer,
    differentiator: s.differentiator,
    businessModelText: s.businessModelText,
    traction: s.traction,
    founderCard,
    mediaCount: s.media.length,
    milestones: s.milestones.map((m) => ({ label: m.label, status: m.status })),
  };
}

/** @deprecated Use loadCompanyStartupsEcosystemHub */
export async function loadCompanyStartupsHub(companyUserId: string) {
  return loadCompanyStartupsEcosystemHub(companyUserId);
}
