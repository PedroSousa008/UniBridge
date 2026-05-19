import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUniversityApi } from '@/lib/university/api-auth';
import {
  generateUniversityInsights,
  getUniversityOverviewMetrics,
} from '@/lib/university/metrics';

export async function POST(request: Request) {
  const auth = await requireUniversityApi();
  if (auth.error) return auth.error;

  const body = await request.json();
  const question = String(body.question || '').toLowerCase();
  const universityId = auth.ctx.university.id;

  const metrics = await getUniversityOverviewMetrics(universityId);
  const insights = await generateUniversityInsights(universityId);

  let answer = insights.join('\n\n');

  if (question.includes('engagement') || question.includes('course')) {
    const courses = await prisma.course.findMany({
      where: { universityId },
      orderBy: { engagementScore: 'asc' },
      take: 3,
    });
    if (courses.length > 0) {
      answer = `Courses with lower engagement: ${courses.map((c) => c.name).join(', ')}. Consider reviewing career path alignment and teacher activity in these programs.\n\n${answer}`;
    }
  }

  if (question.includes('internship')) {
    answer = `${metrics.studentBuckets.internshipReady} students appear internship-ready based on employability and career path compatibility.\n\n${answer}`;
  }

  if (question.includes('company') || question.includes('active')) {
    const partnerships = await prisma.companyPartnership.count({
      where: { universityId, status: 'ACTIVE' },
    });
    answer = `${partnerships} active company partnerships. ${metrics.kpis.pendingPathApprovals} career paths await approval.\n\n${answer}`;
  }

  if (question.includes('report') || question.includes('monthly')) {
    answer = `University Performance Report — ${auth.ctx.university.name}\n\nStudents: ${metrics.kpis.totalStudents}\nWeekly active: ${metrics.kpis.weeklyActiveStudents}\nEmployability score: ${metrics.kpis.employabilityScore}%\nEngagement score: ${metrics.kpis.engagementScore}%\nPublished career paths: ${metrics.kpis.activeCareerPaths}\nStartups in ecosystem: ${metrics.kpis.startupsCreated}\n\n${insights.join('\n')}`;
  }

  return NextResponse.json({ answer });
}
