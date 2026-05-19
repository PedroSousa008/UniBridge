import { NextResponse } from 'next/server';
import { requireUniversityApi } from '@/lib/university/api-auth';
import {
  generateUniversityInsights,
  getUniversityOverviewMetrics,
} from '@/lib/university/metrics';
import { logUniversityActivity } from '@/lib/university/activity';

export async function POST() {
  const auth = await requireUniversityApi();
  if (auth.error) return auth.error;

  const universityId = auth.ctx.university.id;
  const [metrics, insights] = await Promise.all([
    getUniversityOverviewMetrics(universityId),
    generateUniversityInsights(universityId),
  ]);

  const report = [
    `# ${auth.ctx.university.name} — Executive Report`,
    `Generated ${new Date().toLocaleString()}`,
    '',
    '## Key metrics',
    `- Students: ${metrics.kpis.totalStudents}`,
    `- Weekly active: ${metrics.kpis.weeklyActiveStudents}`,
    `- Employability: ${metrics.kpis.employabilityScore}%`,
    `- Engagement: ${metrics.kpis.engagementScore}%`,
    `- Career paths: ${metrics.kpis.activeCareerPaths}`,
    `- Partnerships: ${metrics.kpis.companyPartnerships}`,
    '',
    '## Insights',
    ...insights.map((line) => `- ${line}`),
  ].join('\n');

  await logUniversityActivity(
    universityId,
    'ai_report',
    'AI executive report generated',
    'Full ecosystem report is ready for review.',
    '/university/overview'
  );

  return NextResponse.json({ report, insights });
}
