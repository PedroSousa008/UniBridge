import { prisma } from '@/lib/db';
import { subDays, startOfDay } from 'date-fns';

export async function getUniversityOverviewMetrics(universityId: string) {
  const now = new Date();
  const day7 = subDays(now, 7);
  const day30 = subDays(now, 30);

  const [
    totalStudents,
    totalTeachers,
    activeCourses,
    partnerships,
    publishedPaths,
    startups,
    students,
    recentEvents,
    pendingPaths,
  ] = await Promise.all([
    prisma.studentProfile.count({ where: { universityId } }),
    prisma.teacherProfile.count({ where: { universityId } }),
    prisma.course.count({
      where: { universityId, status: 'ACTIVE' },
    }),
    prisma.companyPartnership.count({
      where: { universityId, status: 'ACTIVE' },
    }),
    prisma.careerPath.count({
      where: { universityId, status: 'PUBLISHED' },
    }),
    prisma.startup.count(),
    prisma.studentProfile.findMany({
      where: { universityId },
      select: {
        id: true,
        engagementScore: true,
        employabilityScore: true,
        userId: true,
        user: {
          select: {
            id: true,
            name: true,
            careerTargets: { select: { id: true, compatibility: true } },
          },
        },
      },
    }),
    prisma.analyticsEvent.findMany({
      where: { createdAt: { gte: day30 } },
      select: { userId: true, createdAt: true },
    }),
    prisma.careerPath.count({
      where: { universityId, status: 'PENDING_APPROVAL' },
    }),
  ]);

  const studentUserIds = students.map((s) => s.userId);
  const activeToday = new Set(
    recentEvents
      .filter((e) => e.createdAt >= startOfDay(now) && e.userId && studentUserIds.includes(e.userId))
      .map((e) => e.userId)
  ).size;

  const activeWeek = new Set(
    recentEvents
      .filter((e) => e.createdAt >= day7 && e.userId && studentUserIds.includes(e.userId))
      .map((e) => e.userId)
  ).size;

  const avgEmployability =
    students.length > 0
      ? students.reduce((s, st) => s + st.employabilityScore, 0) / students.length
      : 0;

  const avgEngagement =
    students.length > 0
      ? students.reduce((s, st) => s + st.engagementScore, 0) / students.length
      : 0;

  const withCareerPath = students.filter(
    (s) => s.user.careerTargets.length > 0
  ).length;

  const atRisk = students.filter(
    (s) => s.engagementScore < 30 && s.employabilityScore < 40
  ).length;

  const internshipReady = students.filter(
    (s) => s.employabilityScore >= 65 && s.user.careerTargets.some((t) => t.compatibility >= 60)
  ).length;

  const improving = students.filter((s) => s.employabilityScore >= 50).length;

  const engagementByDay = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(now, 6 - i);
    const dayStart = startOfDay(d);
    const dayEnd = subDays(startOfDay(now), 6 - i - 1);
    const count = recentEvents.filter(
      (e) =>
        e.createdAt >= dayStart &&
        e.createdAt < (i === 6 ? now : dayEnd) &&
        e.userId &&
        studentUserIds.includes(e.userId)
    ).length;
    return {
      date: dayStart.toISOString().slice(0, 10),
      label: dayStart.toLocaleDateString('en', { weekday: 'short' }),
      value: count,
    };
  });

  return {
    kpis: {
      totalStudents,
      activeStudentsToday: activeToday,
      weeklyActiveStudents: activeWeek,
      avgTimeSpentMinutes: Math.round(avgEngagement * 0.6),
      totalTeachers,
      activeCourses,
      companyPartnerships: partnerships,
      activeCareerPaths: publishedPaths,
      startupsCreated: startups,
      employabilityScore: Math.round(avgEmployability),
      engagementScore: Math.round(avgEngagement),
      platformGrowth: activeWeek > 0 ? Math.min(24, activeWeek * 3) : 0,
      pendingPathApprovals: pendingPaths,
    },
    studentBuckets: {
      improving,
      atRisk,
      withoutCareerPath: students.length - withCareerPath,
      internshipReady,
      highlyEngaged: students.filter((s) => s.engagementScore >= 70).length,
    },
    engagementByDay,
    engagementBy30: engagementByDay,
  };
}

export async function generateUniversityInsights(universityId: string) {
  const metrics = await getUniversityOverviewMetrics(universityId);
  const insights: string[] = [];

  if (metrics.kpis.activeCareerPaths > 0) {
    insights.push(
      `Students connected to ${metrics.kpis.activeCareerPaths} published career path${metrics.kpis.activeCareerPaths > 1 ? 's' : ''} are progressing inside the ecosystem.`
    );
  }

  if (metrics.kpis.weeklyActiveStudents > 0) {
    insights.push(
      `${metrics.kpis.weeklyActiveStudents} students were active on the platform this week.`
    );
  }

  if (metrics.kpis.pendingPathApprovals > 0) {
    insights.push(
      `${metrics.kpis.pendingPathApprovals} company career path${metrics.kpis.pendingPathApprovals > 1 ? 's' : ''} await your approval before students can see them.`
    );
  }

  if (metrics.studentBuckets.atRisk > 0) {
    insights.push(
      `${metrics.studentBuckets.atRisk} student${metrics.studentBuckets.atRisk > 1 ? 's' : ''} may be at employability risk — review engagement and career path alignment.`
    );
  }

  if (insights.length === 0) {
    insights.push(
      'Your ecosystem is growing. Invite students, approve company career paths, and publish partnerships to unlock deeper insights.'
    );
  }

  return insights;
}
