import { requireSession } from '@/lib/session';
import { getUniversityContext } from '@/lib/university/context';
import {
  generateUniversityInsights,
  getUniversityOverviewMetrics,
} from '@/lib/university/metrics';
import { prisma } from '@/lib/db';
import { UniversityOverviewClient } from './overview-client';

export default async function UniversityOverviewPage() {
  const session = await requireSession('UNIVERSITY');
  const ctx = await getUniversityContext(session.user.id);
  if (!ctx) {
    return (
      <UniversityOverviewClient
        kpis={{
          totalStudents: 0,
          activeStudentsToday: 0,
          weeklyActiveStudents: 0,
          avgTimeSpentMinutes: 0,
          totalTeachers: 0,
          activeCourses: 0,
          companyPartnerships: 0,
          activeCareerPaths: 0,
          startupsCreated: 0,
          employabilityScore: 0,
          engagementScore: 0,
          platformGrowth: 0,
          pendingPathApprovals: 0,
        }}
        studentBuckets={{
          improving: 0,
          atRisk: 0,
          withoutCareerPath: 0,
          internshipReady: 0,
          highlyEngaged: 0,
        }}
        engagementByDay={[]}
        insights={['Connect your university profile to unlock metrics.']}
        recentActivity={[]}
      />
    );
  }

  const universityId = ctx.university.id;
  const [metrics, insights, activity] = await Promise.all([
    getUniversityOverviewMetrics(universityId),
    generateUniversityInsights(universityId),
    prisma.activityItem.findMany({
      where: { universityId },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
  ]);

  return (
    <UniversityOverviewClient
      kpis={metrics.kpis}
      studentBuckets={metrics.studentBuckets}
      engagementByDay={metrics.engagementByDay}
      engagementBy30={metrics.engagementBy30}
      insights={insights}
      recentActivity={activity.map((a) => ({
        id: a.id,
        type: a.type,
        title: a.title,
        message: a.message,
        link: a.link,
        createdAt: a.createdAt.toISOString(),
      }))}
    />
  );
}
