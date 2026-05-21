import { prisma } from '@/lib/db';
import { ensureCompanyProfileSchema } from '@/lib/db/ensure-company-profile-schema';
import { ensureCompanyPresenceTables } from '@/lib/db/ensure-company-presence-schema';
import { ensurePartnershipLiveTables } from '@/lib/db/ensure-partnership-live-schema';
import { ensureCompanyEventsEcosystemTables } from '@/lib/db/ensure-company-events-ecosystem-schema';
import { companyStageLabel } from '@/lib/company/company-intelligence';
import { loadCompanyOpportunitiesHub } from '@/lib/company/company-opportunities-hub';
import { loadPartnershipEcosystemHubForCompany } from '@/lib/partnerships/partnership-live-hub';
import { deriveUiState } from '@/lib/partnerships/partnership-intelligence';
import {
  formatEventWhen,
  priorityScore,
  relativeTime,
  trendFromDelta,
  weekAgo,
} from '@/lib/company/company-home-intelligence';
import { eventTypeMeta, statusLabel, type EventTypeId } from '@/lib/company/company-events-intelligence';

export interface CompanyHomeHero {
  companyName: string;
  headline: string | null;
  industry: string | null;
  headquarters: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  liveSignals: string[];
  shortcuts: { label: string; href: string }[];
}

export interface CompanyHomeMetric {
  id: string;
  label: string;
  value: number;
  href: string;
  trend: 'up' | 'down' | 'flat';
  trendLabel: string;
  insight?: string;
}

export interface CompanyHomeLiveAction {
  id: string;
  title: string;
  subtitle: string;
  priority: 'urgent' | 'high' | 'normal';
  href: string;
  at: string;
  kind: string;
}

export interface CompanyHomePendingApproval {
  id: string;
  type: 'partnership' | 'event' | 'application' | 'pipeline' | 'startup';
  typeLabel: string;
  title: string;
  sender: string;
  status: string;
  at: string;
  href: string;
  universityId?: string;
  canAccept: boolean;
  canReject: boolean;
}

export interface CompanyHomeUpcomingEvent {
  id: string;
  title: string;
  typeLabel: string;
  whenLabel: string;
  startsAt: string;
  universityName: string;
  attendeeCount: number;
  href: string;
}

export interface CompanyHomeQuickAction {
  id: string;
  label: string;
  description: string;
  href: string;
}

export interface CompanyHomeStartupMomentum {
  id: string;
  name: string;
  founders: string;
  stage: string;
  momentumLabel: string;
  href: string;
}

export interface CompanyHomePipelineActivity {
  id: string;
  message: string;
  at: string;
  href: string;
}

export interface CompanyHomeEcosystemHub {
  hero: CompanyHomeHero;
  metrics: CompanyHomeMetric[];
  liveActions: CompanyHomeLiveAction[];
  pendingApprovals: CompanyHomePendingApproval[];
  upcomingEvents: CompanyHomeUpcomingEvent[];
  quickCreate: CompanyHomeQuickAction[];
  startupMomentum: CompanyHomeStartupMomentum[];
  pipelineActivity: CompanyHomePipelineActivity[];
  serverTime: string;
}

const QUICK_CREATE: CompanyHomeQuickAction[] = [
  { id: 'opp', label: 'Create opportunity', description: 'Open a new role', href: '/company/opportunities' },
  { id: 'event', label: 'Create event', description: 'Host ecosystem moment', href: '/company/events' },
  { id: 'role', label: 'Add role', description: 'Presence & requirements', href: '/company/presence' },
  { id: 'talent', label: 'Discover talent', description: 'Partner universities', href: '/company/talent' },
  { id: 'startup', label: 'Startup Hub', description: 'Innovation radar', href: '/company/startups' },
  { id: 'partner', label: 'Partnership request', description: 'Connect universities', href: '/company/profile' },
];

export async function loadCompanyHomeEcosystemHub(
  companyUserId: string
): Promise<CompanyHomeEcosystemHub> {
  await Promise.all([
    ensureCompanyProfileSchema(),
    ensureCompanyPresenceTables(),
    ensurePartnershipLiveTables(),
    ensureCompanyEventsEcosystemTables(),
  ]);

  const week = weekAgo();

  const [
    user,
    companyProfile,
    presenceRow,
    partnershipsHub,
    opportunities,
    events,
    pipelineRows,
    appsThisWeek,
    appsPriorWeek,
    partnershipRows,
    followedStartups,
  ] = await Promise.all([
    prisma.user.findUnique({ where: { id: companyUserId }, select: { name: true } }),
    prisma.companyProfile.findUnique({ where: { userId: companyUserId } }),
    prisma.$queryRaw<{ cultureHeadline: string | null }[]>`
      SELECT "cultureHeadline" FROM "CompanyPresenceProfile" WHERE "companyUserId" = ${companyUserId} LIMIT 1
    `.catch(() => []),
    loadPartnershipEcosystemHubForCompany(companyUserId),
    loadCompanyOpportunitiesHub(companyUserId),
    prisma.companyEvent.findMany({
      where: { companyUserId },
      include: { university: { select: { name: true } }, rsvps: true },
      orderBy: { startsAt: 'asc' },
    }),
    prisma.companyPipelineCandidate.findMany({
      where: { companyUserId },
      orderBy: { updatedAt: 'desc' },
      take: 12,
    }),
    prisma.internshipApplication.count({
      where: { internship: { companyUserId }, createdAt: { gte: week } },
    }),
    prisma.internshipApplication.count({
      where: {
        internship: { companyUserId },
        createdAt: { gte: new Date(week.getTime() - 7 * 86400000), lt: week },
      },
    }),
    prisma.$queryRaw<
      {
        id: string;
        universityId: string;
        companyInterested: boolean;
        universityInterested: boolean;
        archived: boolean;
        updatedAt: Date;
      }[]
    >`
      SELECT "id", "universityId", "companyInterested", "universityInterested", "archived", "updatedAt"
      FROM "PartnershipConnection" WHERE "companyUserId" = ${companyUserId} AND "archived" = false
      ORDER BY "updatedAt" DESC
    `.catch(() => []),
    prisma.startupFollower.findMany({
      where: { userId: companyUserId },
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        startup: {
          select: {
            id: true,
            name: true,
            stage: true,
            readinessScore: true,
            founder: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const companyName = companyProfile?.companyName ?? user?.name ?? 'Your company';
  const headline =
    presenceRow[0]?.cultureHeadline ??
    'Live ecosystem of talent, universities, startups, and opportunities.';

  const pendingEvents = events.filter((e) => e.status === 'pending_approval');
  const upcomingApproved = events
    .filter((e) => e.status === 'approved' && new Date(e.startsAt) > new Date())
    .slice(0, 5);

  const interviewCount = opportunities.pipeline.filter((p) =>
    ['interview', 'final_interview', 'offer_received'].includes(p.stage)
  ).length;

  const interviewWeek = opportunities.pipeline.filter(
    (p) =>
      ['interview', 'final_interview', 'offer_received'].includes(p.stage) &&
      new Date(p.updatedAt) >= week
  ).length;

  const savedWeek = pipelineRows.filter(
    (r) => ['saved', 'watching', 'future_potential'].includes(r.stage) && r.updatedAt >= week
  ).length;

  const pathsCount = await prisma.careerPath.count({
    where: { companyUserId, status: 'PUBLISHED' },
  });

  const partnerTrend = trendFromDelta(partnershipsHub.pending.length, 'Connected');
  const rolesTrend = trendFromDelta(0, 'Hiring');
  const appsTrend = trendFromDelta(appsThisWeek - appsPriorWeek);
  const interviewTrend = trendFromDelta(interviewWeek);
  const talentTrend = trendFromDelta(savedWeek, 'Exploring');

  const metrics: CompanyHomeMetric[] = [
    {
      id: 'partners',
      label: 'University partners',
      value: partnershipsHub.active.length,
      href: '/company/profile',
      trend: partnerTrend.direction,
      trendLabel: partnerTrend.label,
      insight:
        partnershipsHub.pending.length > 0
          ? `${partnershipsHub.pending.length} pending`
          : undefined,
    },
    {
      id: 'roles',
      label: 'Open roles',
      value: opportunities.internships.filter((i) => i.status === 'ACTIVE').length,
      href: '/company/opportunities',
      trend: rolesTrend.direction,
      trendLabel: rolesTrend.label,
    },
    {
      id: 'apps',
      label: 'Applications',
      value: opportunities.pipeline.length,
      href: '/company/opportunities',
      trend: appsTrend.direction,
      trendLabel: appsTrend.label,
      insight: appsThisWeek > 0 ? `${appsThisWeek} new this week` : undefined,
    },
    {
      id: 'interview',
      label: 'Interview stage',
      value: interviewCount,
      href: '/company/pipeline',
      trend: interviewTrend.direction,
      trendLabel: interviewTrend.label,
    },
    {
      id: 'talent',
      label: 'Talent pool',
      value: pipelineRows.length,
      href: '/company/talent',
      trend: talentTrend.direction,
      trendLabel: talentTrend.label,
      insight: savedWeek > 0 ? `${savedWeek} new saves` : undefined,
    },
    {
      id: 'paths',
      label: 'Career paths',
      value: pathsCount,
      href: '/company/opportunities',
      trend: 'flat',
      trendLabel: 'Published',
    },
  ];

  const liveActions: CompanyHomeLiveAction[] = [];
  const pendingApprovals: CompanyHomePendingApproval[] = [];

  for (const conn of partnershipRows) {
    const partnership = await prisma.companyPartnership.findUnique({
      where: {
        universityId_companyUserId: {
          universityId: conn.universityId,
          companyUserId,
        },
      },
      select: { status: true },
    });
    const uni = await prisma.university.findUnique({
      where: { id: conn.universityId },
      select: { name: true, slug: true },
    });
    if (!uni) continue;

    const uiState = deriveUiState({
      partnershipStatus: partnership?.status ?? null,
      companyInterested: conn.companyInterested,
      universityInterested: conn.universityInterested,
    });

    if (uiState === 'active') continue;

    const needsResponse = uiState === 'university_interested' || uiState === 'mutual_interest';

    if (needsResponse) {
      const approval: CompanyHomePendingApproval = {
        id: `pc-${conn.id}`,
        type: 'partnership',
        typeLabel: 'Partnership',
        title: uni.name,
        sender: uni.name,
        status: uiState === 'mutual_interest' ? 'Mutual interest' : 'University interested',
        at: conn.updatedAt.toISOString(),
        href: `/universities/${uni.slug}`,
        universityId: conn.universityId,
        canAccept: true,
        canReject: true,
      };
      pendingApprovals.push(approval);
      liveActions.push({
        id: `la-p-${conn.id}`,
        title: uiState === 'mutual_interest' ? 'Partnership ready to activate' : 'New partnership request',
        subtitle: uni.name,
        priority: uiState === 'mutual_interest' ? 'urgent' : 'high',
        href: `/universities/${uni.slug}`,
        at: conn.updatedAt.toISOString(),
        kind: 'partnership',
      });
    } else if (uiState === 'company_interested') {
      liveActions.push({
        id: `la-pw-${conn.id}`,
        title: 'Partnership request sent',
        subtitle: `Awaiting ${uni.name}`,
        priority: 'normal',
        href: `/universities/${uni.slug}`,
        at: conn.updatedAt.toISOString(),
        kind: 'partnership',
      });
    }
  }

  for (const ev of pendingEvents) {
    const evType = (ev as { eventType?: string }).eventType;
    const meta = eventTypeMeta((evType as EventTypeId) ?? 'networking');
    pendingApprovals.push({
      id: `ev-${ev.id}`,
      type: 'event',
      typeLabel: 'Event approval',
      title: ev.title,
      sender: ev.university?.name ?? 'University',
      status: statusLabel(ev.status),
      at: ev.updatedAt.toISOString(),
      href: `/company/events?event=${ev.id}`,
      canAccept: false,
      canReject: false,
    });
    liveActions.push({
      id: `la-ev-${ev.id}`,
      title: 'Event awaiting university approval',
      subtitle: ev.title,
      priority: 'high',
      href: `/company/events?event=${ev.id}`,
      at: ev.updatedAt.toISOString(),
      kind: 'event',
    });
  }

  const recentApps = opportunities.pipeline
    .filter((p) => new Date(p.updatedAt) >= week)
    .slice(0, 4);

  for (const app of recentApps) {
    if (['interview', 'final_interview'].includes(app.stage)) {
      liveActions.push({
        id: `la-app-${app.applicationId}`,
        title: 'Student in interview stage',
        subtitle: `${app.studentName} · ${app.roleTitle}`,
        priority: 'high',
        href: `/company/pipeline?student=${app.studentUserId}`,
        at: app.updatedAt,
        kind: 'application',
      });
    } else {
      pendingApprovals.push({
        id: `app-${app.applicationId}`,
        type: 'application',
        typeLabel: 'Application',
        title: app.roleTitle,
        sender: app.studentName,
        status: companyStageLabel(app.stage as Parameters<typeof companyStageLabel>[0]),
        at: app.updatedAt,
        href: `/company/opportunities?application=${app.applicationId}`,
        canAccept: false,
        canReject: false,
      });
    }
  }

  liveActions.sort(
    (a, b) =>
      priorityScore(
        a.priority === 'urgent' ? 9 : a.priority === 'high' ? 7 : 4,
        5,
        (Date.now() - new Date(a.at).getTime()) / 3600000
      ) -
      priorityScore(
        b.priority === 'urgent' ? 9 : b.priority === 'high' ? 7 : 4,
        5,
        (Date.now() - new Date(b.at).getTime()) / 3600000
      )
  );

  const upcomingEvents: CompanyHomeUpcomingEvent[] = upcomingApproved.map((ev) => {
    const evType = (ev as { eventType?: string }).eventType;
    const meta = eventTypeMeta((evType as EventTypeId) ?? 'networking');
    return {
      id: ev.id,
      title: ev.title,
      typeLabel: meta.label,
      whenLabel: formatEventWhen(ev.startsAt.toISOString()),
      startsAt: ev.startsAt.toISOString(),
      universityName: ev.university?.name ?? 'Partner university',
      attendeeCount: ev.rsvps.length,
      href: `/company/events?event=${ev.id}`,
    };
  });

  const pipelineUserIds = [...new Set(pipelineRows.map((r) => r.studentUserId))];
  const pipelineUsers = pipelineUserIds.length
    ? await prisma.user.findMany({
        where: { id: { in: pipelineUserIds } },
        select: { id: true, name: true },
      })
    : [];
  const nameByUser = new Map(pipelineUsers.map((u) => [u.id, u.name ?? 'Student']));

  const pipelineActivity: CompanyHomePipelineActivity[] = pipelineRows.slice(0, 5).map((row) => {
    const name = nameByUser.get(row.studentUserId) ?? 'Student';
    const stage = row.stage.replace(/_/g, ' ');
    return {
      id: row.id,
      message: `${name} · ${stage}`,
      at: row.updatedAt.toISOString(),
      href: `/company/pipeline?student=${row.studentUserId}`,
    };
  });

  const startupMomentum: CompanyHomeStartupMomentum[] = followedStartups.map((f) => ({
    id: f.startup.id,
    name: f.startup.name,
    founders: f.startup.founder?.name ?? 'Founder',
    stage: f.startup.stage ?? 'Active',
    momentumLabel:
      f.startup.readinessScore >= 70 ? 'High momentum' : 'On your radar',
    href: `/company/startups?startup=${f.startup.id}`,
  }));

  const liveSignals = [
    partnershipsHub.pending.length > 0
      ? `${partnershipsHub.pending.length} partnership signal${partnershipsHub.pending.length !== 1 ? 's' : ''}`
      : `${partnershipsHub.active.length} live partnerships`,
    pendingEvents.length > 0
      ? `${pendingEvents.length} event${pendingEvents.length !== 1 ? 's' : ''} awaiting approval`
      : upcomingEvents.length > 0
        ? `${upcomingEvents.length} upcoming ecosystem moment${upcomingEvents.length !== 1 ? 's' : ''}`
        : 'Schedule your next event',
    appsThisWeek > 0 ? `+${appsThisWeek} applications this week` : 'Talent pipeline synced',
    interviewCount > 0 ? `${interviewCount} in interview stage` : 'Discover high-potential talent',
  ];

  return {
    hero: {
      companyName,
      headline,
      industry: companyProfile?.industry ?? null,
      headquarters: companyProfile?.headquarters ?? null,
      logoUrl: companyProfile?.logoUrl ?? null,
      bannerUrl: companyProfile?.bannerUrl ?? null,
      liveSignals,
      shortcuts: [
        { label: 'Talent', href: '/company/talent' },
        { label: 'Pipeline', href: '/company/pipeline' },
        { label: 'Events', href: '/company/events' },
        { label: 'Startups', href: '/company/startups' },
        { label: 'Profile', href: '/company/profile' },
      ],
    },
    metrics,
    liveActions: liveActions.slice(0, 5),
    pendingApprovals: pendingApprovals.slice(0, 6),
    upcomingEvents,
    quickCreate: QUICK_CREATE,
    startupMomentum,
    pipelineActivity,
    serverTime: new Date().toISOString(),
  };
}

/** @deprecated Use loadCompanyHomeEcosystemHub */
export async function loadCompanyHomeHub(userId: string) {
  const hub = await loadCompanyHomeEcosystemHub(userId);
  return {
    company: {
      name: hub.hero.companyName,
      industry: hub.hero.industry,
      logoUrl: hub.hero.logoUrl,
      headquarters: hub.hero.headquarters,
    },
    stats: {
      activePartnerships: hub.metrics.find((m) => m.id === 'partners')?.value ?? 0,
      openRoles: hub.metrics.find((m) => m.id === 'roles')?.value ?? 0,
      totalApplications: hub.metrics.find((m) => m.id === 'apps')?.value ?? 0,
      interviewStage: hub.metrics.find((m) => m.id === 'interview')?.value ?? 0,
      talentPool: hub.metrics.find((m) => m.id === 'talent')?.value ?? 0,
      publishedCareerPaths: hub.metrics.find((m) => m.id === 'paths')?.value ?? 0,
    },
    recentApplications: [],
    partnerships: [],
    ecosystemLinks: hub.hero.shortcuts.map((s) => ({ label: s.label, href: s.href })),
    serverTime: hub.serverTime,
  };
}
