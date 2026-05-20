'use client';

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { OPPORTUNITY_STAGES } from '@/lib/career/opportunities-intelligence';

export function CompanyInsightsClient({
  stats,
  byStage,
  pipelineCount,
}: {
  stats: {
    activePartnerships: number;
    openRoles: number;
    totalApplications: number;
    interviewStage: number;
    talentPool: number;
    publishedCareerPaths: number;
  };
  byStage: Record<string, number>;
  pipelineCount: number;
}) {
  const chartData = OPPORTUNITY_STAGES.filter((s) => !['saved', 'preparing'].includes(s.id)).map((s) => ({
    name: s.label,
    count: byStage[s.id] ?? 0,
  }));

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Talent pool', value: stats.talentPool },
          { label: 'Applications', value: stats.totalApplications },
          { label: 'In interview+', value: stats.interviewStage },
          { label: 'Partnerships', value: stats.activePartnerships },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl border p-5">
            <p className="text-3xl font-semibold">{m.value}</p>
            <p className="text-sm text-muted-foreground">{m.label}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border p-6">
        <p className="mb-4 font-medium">Pipeline by stage</p>
        <p className="mb-4 text-sm text-muted-foreground">
          {pipelineCount} total candidates — mirrors student-side opportunity stages.
        </p>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#0f172a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
