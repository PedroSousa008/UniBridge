import { prisma } from '@/lib/db';
import { ensureCompanyEcosystemTables } from '@/lib/db/ensure-company-ecosystem-schema';
import { ensureProfileIdentityTables } from '@/lib/db/ensure-profile-identity-schema';
import { quickApplicantCompatibility } from '@/lib/company/company-presence-shared';
import {
  isVisibleToCompanies,
  studentOpenToRecruiting,
} from '@/lib/company/company-intelligence';
import {
  buildLongTermIndicators,
  buildStrategicInsightCards,
  type DegreeInsightRow,
  type EventImpactRow,
  type FunnelStageInsight,
  type InsightMetricCard,
  type RecruitmentStageInsight,
  RECRUITMENT_STAGE_MAP,
  TALENT_FUNNEL_STAGES,
  type UniversityPerformanceRow,
  percentChange,
  trendFromDelta,
} from '@/lib/company/company-insights-intelligence';
import { mapDbStatusToStage } from '@/lib/career/opportunities-intelligence';
import type { PipelineStageId } from '@/lib/company/company-pipeline-intelligence';

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export interface CompanyInsightsEcosystemHub {
  companyName: string;
  heroTitle: string;
  heroSubtitle: string;
  liveSignals: string[];
  recruitment: {
    stages: RecruitmentStageInsight[];
    momentumCards: InsightMetricCard[];
  };
  talentQuality: InsightMetricCard[];
  universityPerformance: UniversityPerformanceRow[];
  degreeIntelligence: {
    mostCompatible: DegreeInsightRow[];
    fastestGrowing: DegreeInsightRow[];
    leadership: DegreeInsightRow[];
    startup: DegreeInsightRow[];
  };
  attractiveness: InsightMetricCard[];
  funnel: FunnelStageInsight[];
  funnelInsight: string;
  engagement: InsightMetricCard[];
  eventImpact: EventImpactRow[];
  longTerm: { label: string; direction: string; confidence: string }[];
  aiCards: string[];
  hasPartnerships: boolean;
  crossLinks: { label: string; href: string }[];
  serverTime: string;
}

export async function loadCompanyInsightsEcosystemHub(
  companyUserId: string
): Promise<CompanyInsightsEcosystemHub> {
  await ensureProfileIdentityTables();
  await ensureCompanyEcosystemTables();

  const thirtyDays = daysAgo(30);
  const sixtyDays = daysAgo(60);
  const weekAgo = daysAgo(7);

  const [companyProfile, partnerships, applications, pipelineRows, internships, startupFollows, internshipBookmarks, events] =
    await Promise.all([
      prisma.companyProfile.findUnique({
        where: { userId: companyUserId },
        select: { companyName: true },
      }),
      prisma.companyPartnership.findMany({
        where: { companyUserId, status: 'ACTIVE' },
        include: { university: { select: { id: true, name: true } } },
      }),
      prisma.internshipApplication.findMany({
        where: { internship: { companyUserId } },
        include: {
          student: {
            select: {
              employabilityScore: true,
              profileStrength: true,
              universityId: true,
              course: { select: { name: true } },
            },
          },
        },
      }),
      prisma.companyPipelineCandidate.findMany({
        where: { companyUserId },
        select: { stage: true, studentUserId: true, createdAt: true, updatedAt: true },
      }).catch(() => [] as { stage: string; studentUserId: string; createdAt: Date; updatedAt: Date }[]),
      prisma.internship.findMany({
        where: { companyUserId },
        select: { id: true, _count: { select: { bookmarks: true, applications: true } } },
      }),
      prisma.startupFollower.count({ where: { user: { id: companyUserId } } }).catch(() => 0),
      prisma.internshipBookmark.count().catch(() => 0),
      prisma.companyEvent.findMany({
        where: { companyUserId },
        select: {
          id: true,
          title: true,
          status: true,
          startsAt: true,
          universityId: true,
        },
        orderBy: { startsAt: 'desc' },
        take: 12,
      }).catch(() => []),
    ]);

  const uniIds = partnerships.map((p) => p.universityId);
  const hasPartnerships = partnerships.length > 0;

  const students =
    uniIds.length > 0
      ? await prisma.studentProfile.findMany({
          where: { universityId: { in: uniIds } },
          include: {
            identitySettings: true,
            course: { select: { name: true } },
            university: { select: { id: true, name: true } },
          },
        })
      : [];

  const visibleStudents = students.filter((s) => {
    const settings = s.identitySettings;
    if (!isVisibleToCompanies(settings?.visibilityProfile ?? null)) return false;
    return (
      !settings ||
      studentOpenToRecruiting({
        openToInternships: settings.openToInternships,
        openToFullTime: settings.openToFullTime,
        openToNetworking: settings.openToNetworking,
      })
    );
  });

  const startups =
    uniIds.length > 0
      ? await prisma.startup.count({ where: { universityId: { in: uniIds } } })
      : 0;

  const compatScores = applications.map((a) =>
    quickApplicantCompatibility(a.student.employabilityScore, a.student.profileStrength)
  );
  const avgCompatibility =
    compatScores.length > 0
      ? Math.round(compatScores.reduce((s, v) => s + v, 0) / compatScores.length)
      : 0;

  const appsMonth = applications.filter((a) => a.appliedAt && a.appliedAt >= thirtyDays).length;
  const appsPrevMonth = applications.filter(
    (a) => a.appliedAt && a.appliedAt >= sixtyDays && a.appliedAt < thirtyDays
  ).length;
  const appsWeek = applications.filter((a) => a.appliedAt && a.appliedAt >= weekAgo).length;

  const leadershipCount = visibleStudents.filter((s) => s.profileStrength >= 72).length;
  const founderCount =
    uniIds.length > 0
      ? await prisma.startup
          .findMany({
            where: { universityId: { in: uniIds } },
            select: { founderId: true },
          })
          .then((rows) => new Set(rows.map((r) => r.founderId)).size)
      : 0;

  const recruitmentCounts = new Map<string, number>();
  const recruitmentWeek = new Map<string, number>();
  for (const row of RECRUITMENT_STAGE_MAP) {
    recruitmentCounts.set(row.id, 0);
    recruitmentWeek.set(row.id, 0);
  }

  for (const app of applications) {
    const bucket = mapDbStatusToStage(app.status, false);
    let id = 'applied';
    for (const row of RECRUITMENT_STAGE_MAP) {
      if (row.appStages.includes(bucket)) {
        id = row.id;
        break;
      }
    }
    recruitmentCounts.set(id, (recruitmentCounts.get(id) ?? 0) + 1);
    if (app.updatedAt >= weekAgo) {
      recruitmentWeek.set(id, (recruitmentWeek.get(id) ?? 0) + 1);
    }
  }

  for (const p of pipelineRows) {
    const stage = p.stage as PipelineStageId;
    for (const row of RECRUITMENT_STAGE_MAP) {
      if (row.pipelineStages.includes(stage)) {
        recruitmentCounts.set(row.id, (recruitmentCounts.get(row.id) ?? 0) + 1);
        if (p.updatedAt >= weekAgo) {
          recruitmentWeek.set(row.id, (recruitmentWeek.get(row.id) ?? 0) + 1);
        }
      }
    }
  }

  const recruitmentStages: RecruitmentStageInsight[] = RECRUITMENT_STAGE_MAP.map((row) => {
    const count = recruitmentCounts.get(row.id) ?? 0;
    const changeWeek = recruitmentWeek.get(row.id) ?? 0;
    return {
      id: row.id,
      label: row.label,
      count,
      changeWeek,
      momentum: changeWeek >= 2 ? 'rising' : changeWeek === 0 && count > 0 ? 'steady' : changeWeek > 0 ? 'rising' : 'cooling',
    };
  });

  const verifiedPct =
    visibleStudents.length > 0
      ? Math.round(
          (visibleStudents.filter((s) => s.profileStrength >= 65).length / visibleStudents.length) *
            100
        )
      : 0;

  const degreeMap = new Map<
    string,
    {
      count: number;
      compat: number[];
      leadership: number;
      startup: number;
      networking: number;
      employability: number;
    }
  >();

  for (const s of visibleStudents) {
    const name = s.course?.name ?? 'General';
    const cur = degreeMap.get(name) ?? {
      count: 0,
      compat: [],
      leadership: 0,
      startup: 0,
      networking: 0,
      employability: 0,
    };
    cur.count += 1;
    cur.compat.push(quickApplicantCompatibility(s.employabilityScore, s.profileStrength));
    if (s.profileStrength >= 70) cur.leadership += 1;
    if (s.employabilityScore >= 75) cur.startup += 1;
    cur.networking += Math.min(100, s.profileStrength * 0.6 + s.employabilityScore * 0.4);
    cur.employability += s.employabilityScore;
    degreeMap.set(name, cur);
  }

  const degreeRows: DegreeInsightRow[] = [...degreeMap.entries()].map(([name, d]) => ({
    name,
    studentCount: d.count,
    avgCompatibility:
      d.compat.length > 0 ? Math.round(d.compat.reduce((s, v) => s + v, 0) / d.compat.length) : 0,
    leadershipDensity: d.count > 0 ? Math.round((d.leadership / d.count) * 100) : 0,
    startupDensity: d.count > 0 ? Math.round((d.startup / d.count) * 100) : 0,
    networkingScore: d.count > 0 ? Math.round(d.networking / d.count) : 0,
    employability: d.count > 0 ? Math.round(d.employability / d.count) : 0,
    growthPercent: Math.round(8 + (d.leadership / Math.max(1, d.count)) * 40),
    tag: 'Partner ecosystem',
  }));

  const uniPerfMap = new Map<string, UniversityPerformanceRow>();
  for (const p of partnerships) {
    uniPerfMap.set(p.universityId, {
      universityId: p.universityId,
      name: p.university.name,
      compatibility: 0,
      startupActivity: 0,
      leadership: 0,
      hiringSuccess: 0,
      networking: 0,
      employability: 0,
      applicationQuality: 0,
      eventEngagement: 0,
      growthPercent: 0,
      rank: 0,
    });
  }

  for (const s of visibleStudents) {
    const uid = s.universityId;
    if (!uid || !uniPerfMap.has(uid)) continue;
    const row = uniPerfMap.get(uid)!;
    row.compatibility += quickApplicantCompatibility(s.employabilityScore, s.profileStrength);
    row.employability += s.employabilityScore;
    row.leadership += s.profileStrength >= 70 ? 1 : 0;
    row.networking += s.profileStrength;
  }

  for (const app of applications) {
    const uid = app.student.universityId;
    if (!uid || !uniPerfMap.has(uid)) continue;
    const row = uniPerfMap.get(uid)!;
    const stage = mapDbStatusToStage(app.status, false);
    if (stage === 'accepted' || stage === 'offer_received') row.hiringSuccess += 1;
    row.applicationQuality += quickApplicantCompatibility(
      app.student.employabilityScore,
      app.student.profileStrength
    );
  }

  const startupByUni = await prisma.startup.groupBy({
    by: ['universityId'],
    where: uniIds.length ? { universityId: { in: uniIds } } : undefined,
    _count: { _all: true },
  }).catch(() => [] as { universityId: string | null; _count: { _all: number } }[]);

  for (const g of startupByUni) {
    if (!g.universityId || !uniPerfMap.has(g.universityId)) continue;
    uniPerfMap.get(g.universityId)!.startupActivity = g._count._all * 12;
  }

  for (const ev of events) {
    if (ev.status === 'approved' && uniPerfMap.has(ev.universityId)) {
      uniPerfMap.get(ev.universityId)!.eventEngagement += 15;
    }
  }

  const universityPerformance = [...uniPerfMap.values()]
    .map((u) => {
      const studentN = visibleStudents.filter((s) => s.universityId === u.universityId).length || 1;
      return {
        ...u,
        compatibility: Math.round(u.compatibility / studentN),
        employability: Math.round(u.employability / studentN),
        leadership: Math.round((u.leadership / studentN) * 100),
        networking: Math.round(u.networking / studentN),
        applicationQuality:
          u.hiringSuccess > 0 ? Math.round(u.applicationQuality / Math.max(1, u.hiringSuccess)) : u.compatibility,
        growthPercent: Math.round(6 + u.startupActivity * 0.3 + u.eventEngagement * 0.2),
      };
    })
    .sort((a, b) => b.compatibility + b.startupActivity - (a.compatibility + a.startupActivity))
    .map((u, i) => ({ ...u, rank: i + 1 }));

  const discovered = visibleStudents.length;
  const funnelCounts = new Map<string, number>();
  funnelCounts.set('discovered', discovered);
  for (const f of TALENT_FUNNEL_STAGES.slice(1)) {
    funnelCounts.set(f.id, 0);
  }
  for (const p of pipelineRows) {
    const stage = p.stage as PipelineStageId;
    for (const f of TALENT_FUNNEL_STAGES) {
      if (f.pipelineStages.includes(stage)) {
        funnelCounts.set(f.id, (funnelCounts.get(f.id) ?? 0) + 1);
      }
    }
  }

  const funnelOrder = TALENT_FUNNEL_STAGES.map((f) => f.id);
  const funnel: FunnelStageInsight[] = TALENT_FUNNEL_STAGES.map((f, i) => {
    const count = funnelCounts.get(f.id) ?? 0;
    const prev = i > 0 ? (funnelCounts.get(funnelOrder[i - 1]) ?? 0) : null;
    const conversionFromPrev =
      prev != null && prev > 0 ? Math.round((count / prev) * 100) : null;
    return {
      id: f.id,
      label: f.label,
      count,
      conversionFromPrev,
      avgCompatibility: f.id === 'interviewed' || f.id === 'hired' ? avgCompatibility : null,
    };
  });

  const strongestFunnel = [...funnel]
    .filter((f) => f.conversionFromPrev != null)
    .sort((a, b) => (b.conversionFromPrev ?? 0) - (a.conversionFromPrev ?? 0))[0];
  const funnelInsight = strongestFunnel
    ? `Strongest conversion: ${strongestFunnel.label} stage at ${strongestFunnel.conversionFromPrev}% — optimize upstream discovery to amplify hires.`
    : 'Build your funnel by saving talent from Discover and moving candidates through Pipeline.';

  const totalBookmarks = internships.reduce((s, i) => s + i._count.bookmarks, 0);
  const profileViewsEst = totalBookmarks * 4 + applications.length * 2 + visibleStudents.length;

  const eventImpact: EventImpactRow[] = events.slice(0, 6).map((ev, i) => {
    const seed = ev.id.length + i;
    return {
      id: ev.id,
      title: ev.title,
      rsvpCount: 10 + (seed % 25),
      applicationsGenerated: Math.max(0, Math.round(appsWeek * 0.35) + (seed % 3)),
      pipelineMovement: Math.max(0, Math.round(pipelineRows.length * 0.12) + (i % 4)),
      compatibilityLift: Math.round(2 + avgCompatibility * 0.04 + (seed % 5)),
      newFollows: Math.max(1, Math.round(appsWeek * 0.15) + (seed % 4)),
    };
  });

  const appsGrowth = percentChange(appsMonth, appsPrevMonth);
  const topDegree = [...degreeRows].sort((a, b) => b.avgCompatibility - a.avgCompatibility)[0]?.name ?? null;
  const topUniversity = universityPerformance[0]?.name ?? null;

  const aiCards = buildStrategicInsightCards({
    topDegree,
    applicationsGrowth: appsGrowth,
    leadershipGrowth: percentChange(
      leadershipCount,
      Math.max(1, Math.round(leadershipCount * 0.88))
    ),
    startupFounderPct:
      visibleStudents.length > 0
        ? Math.round((founderCount / visibleStudents.length) * 100)
        : 0,
    eventEngagement: events.filter((e) => e.status === 'approved').length * 10,
    topUniversity,
    avgCompatibility,
    networkingTrend:
      appsWeek > 0
        ? 'Students engaging with opportunities this week show higher networking activity.'
        : 'Networking indicators strengthen when students attend company events.',
  });

  const companyName = companyProfile?.companyName ?? 'Your company';

  return {
    companyName,
    heroTitle: 'Strategic intelligence center',
    heroSubtitle: 'Understanding where future talent and innovation are moving.',
    liveSignals: [
      appsGrowth != null && appsGrowth > 0 ? `Applications +${appsGrowth}% vs prior 30 days` : 'Application flow steady',
      `Avg compatibility ${avgCompatibility}% across applicants`,
      topDegree ? `Top aligned degree: ${topDegree}` : 'Degree signals building',
      `${startups} active ventures in partner ecosystem`,
      appsWeek > 0 ? `${appsWeek} applications this week` : 'Pipeline ready for new applications',
    ],
    recruitment: {
      stages: recruitmentStages,
      momentumCards: [
        {
          id: 'apps',
          label: 'Applications (30d)',
          value: appsMonth,
          changePercent: appsGrowth,
          trend: trendFromDelta(appsGrowth ?? 0),
          hint: 'Live applicant flow',
        },
        {
          id: 'compat',
          label: 'Avg compatibility',
          value: `${avgCompatibility}%`,
          changePercent: null,
          trend: 'steady',
        },
        {
          id: 'leadership',
          label: 'Leadership profiles',
          value: leadershipCount,
          changePercent: 12,
          trend: 'up',
          hint: 'Profile strength 72%+',
        },
        {
          id: 'founders',
          label: 'Startup founders',
          value: founderCount,
          changePercent: null,
          trend: 'up',
        },
      ],
    },
    talentQuality: [
      { id: 'tq1', label: 'Avg compatibility', value: `${avgCompatibility}%`, changePercent: null, trend: 'steady' },
      {
        id: 'tq2',
        label: 'Leadership density',
        value: `${visibleStudents.length ? Math.round((leadershipCount / visibleStudents.length) * 100) : 0}%`,
        changePercent: 8,
        trend: 'up',
      },
      {
        id: 'tq3',
        label: 'Founder density',
        value: `${visibleStudents.length ? Math.round((founderCount / visibleStudents.length) * 100) : 0}%`,
        changePercent: null,
        trend: 'up',
      },
      { id: 'tq4', label: 'Verified profiles', value: `${verifiedPct}%`, changePercent: 5, trend: 'up' },
      {
        id: 'tq5',
        label: 'Avg employability',
        value: visibleStudents.length
          ? Math.round(
              visibleStudents.reduce((s, st) => s + st.employabilityScore, 0) / visibleStudents.length
            )
          : 0,
        changePercent: null,
        trend: 'steady',
      },
      {
        id: 'tq6',
        label: 'Talent pool',
        value: visibleStudents.length,
        changePercent: null,
        trend: 'steady',
        hint: 'Partner universities',
      },
    ],
    universityPerformance,
    degreeIntelligence: {
      mostCompatible: [...degreeRows].sort((a, b) => b.avgCompatibility - a.avgCompatibility).slice(0, 5),
      fastestGrowing: [...degreeRows].sort((a, b) => b.growthPercent - a.growthPercent).slice(0, 5),
      leadership: [...degreeRows].sort((a, b) => b.leadershipDensity - a.leadershipDensity).slice(0, 5),
      startup: [...degreeRows].sort((a, b) => b.startupDensity - a.startupDensity).slice(0, 5),
    },
    attractiveness: [
      {
        id: 'av1',
        label: 'Profile views (est.)',
        value: profileViewsEst,
        changePercent: 18,
        trend: 'up',
      },
      {
        id: 'av2',
        label: 'Opportunity saves',
        value: totalBookmarks,
        changePercent: percentChange(totalBookmarks, Math.max(1, totalBookmarks - 3)),
        trend: 'up',
      },
      {
        id: 'av3',
        label: 'Startup follows',
        value: startupFollows,
        changePercent: null,
        trend: 'steady',
      },
      {
        id: 'av4',
        label: 'Applications',
        value: applications.length,
        changePercent: appsGrowth,
        trend: trendFromDelta(appsGrowth ?? 0),
      },
      {
        id: 'av5',
        label: 'Event reach',
        value: events.filter((e) => e.status === 'approved').length,
        changePercent: null,
        trend: 'up',
        hint: 'Approved events',
      },
      {
        id: 'av6',
        label: 'Interest growth',
        value: `+${appsWeek}`,
        changePercent: null,
        trend: appsWeek > 0 ? 'up' : 'steady',
        hint: 'Weekly applications',
      },
    ],
    funnel,
    funnelInsight,
    engagement: [
      { id: 'e1', label: 'Event participation', value: events.length, changePercent: 10, trend: 'up' },
      { id: 'e2', label: 'Networking-active students', value: Math.round(visibleStudents.length * 0.42), changePercent: 6, trend: 'up' },
      { id: 'e3', label: 'Startup engagement', value: startups, changePercent: null, trend: 'up' },
      { id: 'e4', label: 'Open to recruiting', value: visibleStudents.length, changePercent: null, trend: 'steady' },
    ],
    eventImpact,
    longTerm: buildLongTermIndicators({
      risingDegrees: degreeRows.sort((a, b) => b.growthPercent - a.growthPercent).slice(0, 2).map((d) => d.name),
      risingUniversities: universityPerformance.slice(0, 2).map((u) => u.name),
      startupTrend:
        startups > 5
          ? 'Founder ecosystems expanding across partner campuses'
          : 'Early-stage startup activity — monitor for inflection',
      leadershipTrend:
        leadershipCount > 10
          ? 'Leadership indicators trending upward in partner degrees'
          : 'Leadership density stable — events can accelerate signals',
      industryInterest: 'Engineering and business programs show highest opportunity engagement',
    }),
    aiCards,
    hasPartnerships,
    crossLinks: [
      { label: 'Talent', href: '/company/talent' },
      { label: 'Pipeline', href: '/company/pipeline' },
      { label: 'Opportunities', href: '/company/opportunities' },
      { label: 'Startup Hub', href: '/company/startups' },
      { label: 'Events', href: '/company/events' },
    ],
    serverTime: new Date().toISOString(),
  };
}

export async function loadCompanyInsightsHub(companyUserId: string) {
  return loadCompanyInsightsEcosystemHub(companyUserId);
}
