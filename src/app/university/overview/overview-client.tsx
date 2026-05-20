'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Briefcase,
  Building2,
  Clock,
  GraduationCap,
  Rocket,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { KpiCard } from '@/components/university/kpi-card';
import { EngagementChart } from '@/components/university/engagement-chart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { getUniversityOverviewMetrics } from '@/lib/university/metrics';
import { PartnershipEcosystemPanel } from '@/components/partnerships/partnership-ecosystem-panel';

type OverviewMetrics = Awaited<ReturnType<typeof getUniversityOverviewMetrics>>;

export interface UniversityOverviewClientProps {
  kpis: OverviewMetrics['kpis'];
  studentBuckets: OverviewMetrics['studentBuckets'];
  engagementByDay: OverviewMetrics['engagementByDay'];
  engagementBy30?: OverviewMetrics['engagementBy30'];
  insights: string[];
  recentActivity: {
    id: string;
    type: string;
    title: string;
    message: string | null;
    link: string | null;
    createdAt: string;
  }[];
}

type ChartPeriod = '7D' | '30D' | '90D' | 'Year';

const BUCKET_FILTERS = [
  { key: 'improving', label: 'Improving', filter: 'improving' },
  { key: 'atRisk', label: 'At risk', filter: 'at-risk' },
  { key: 'withoutCareerPath', label: 'No career path', filter: 'no-path' },
  { key: 'internshipReady', label: 'Internship ready', filter: 'internship-ready' },
  { key: 'highlyEngaged', label: 'Highly engaged', filter: 'engaged' },
] as const;

export function UniversityOverviewClient({
  kpis,
  studentBuckets,
  engagementByDay,
  engagementBy30,
  insights,
  recentActivity,
}: UniversityOverviewClientProps) {
  const router = useRouter();
  const [period, setPeriod] = useState<ChartPeriod>('7D');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportMessage, setReportMessage] = useState<string | null>(null);

  const chartData = useMemo(() => {
    const source =
      period === '7D'
        ? engagementByDay
        : engagementBy30 ?? engagementByDay;
    return source.map((p) => ({ label: p.label, value: p.value }));
  }, [period, engagementByDay, engagementBy30]);

  const kpiItems = [
    {
      label: 'Total students',
      value: kpis.totalStudents,
      icon: Users,
      href: '/university/academics?tab=students',
    },
    {
      label: 'Active today',
      value: kpis.activeStudentsToday,
      icon: Activity,
      href: '/university/academics?tab=students',
    },
    {
      label: 'Weekly active',
      value: kpis.weeklyActiveStudents,
      change: kpis.platformGrowth,
      icon: TrendingUp,
      href: '/university/academics?tab=students',
    },
    {
      label: 'Avg. time (min)',
      value: kpis.avgTimeSpentMinutes,
      icon: Clock,
      href: '/university/academics',
    },
    {
      label: 'Teachers',
      value: kpis.totalTeachers,
      icon: GraduationCap,
      href: '/university/academics?tab=teachers',
    },
    {
      label: 'Active courses',
      value: kpis.activeCourses,
      icon: BookOpen,
      href: '/university/academics?tab=courses',
    },
    {
      label: 'Company partnerships',
      value: kpis.companyPartnerships,
      icon: Building2,
      href: '/university/career?tab=partnerships',
    },
    {
      label: 'Career paths',
      value: kpis.activeCareerPaths,
      icon: Briefcase,
      href: '/university/career?tab=paths',
    },
    {
      label: 'Startups created',
      value: kpis.startupsCreated,
      icon: Rocket,
      href: '/university/innovation?tab=startups',
    },
    {
      label: 'Employability score',
      value: `${kpis.employabilityScore}%`,
      icon: Target,
      href: '/university/career?tab=analytics',
    },
    {
      label: 'Engagement score',
      value: `${kpis.engagementScore}%`,
      icon: Sparkles,
      href: '/university/innovation?tab=overview',
    },
    {
      label: 'Pending approvals',
      value: kpis.pendingPathApprovals,
      icon: AlertTriangle,
      href: '/university/career?tab=paths',
    },
  ];

  async function handleGenerateReport() {
    setReportLoading(true);
    setReportMessage(null);
    try {
      const res = await fetch('/api/university/ai-report', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate report');
      setReportMessage(data.report || 'Report generated successfully.');
      router.refresh();
    } catch (e) {
      setReportMessage(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setReportLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Executive overview"
        subtitle="Real-time health of your academic, career, and innovation ecosystem."
        badge="University OS"
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {kpiItems.map((item) => (
          <KpiCard
            key={item.label}
            label={item.label}
            value={item.value}
            change={item.change}
            icon={item.icon}
            href={item.href}
          />
        ))}
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
            <CardTitle>Student engagement</CardTitle>
            <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
              {(['7D', '30D', '90D', 'Year'] as ChartPeriod[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                    period === p
                      ? 'bg-card text-foreground shadow-soft'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <EngagementChart data={chartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand" />
              AI insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3">
              {insights.map((text, i) => (
                <li key={i} className="text-sm leading-relaxed text-muted-foreground">
                  {text}
                </li>
              ))}
            </ul>
            <Button
              variant="brand"
              className="w-full"
              disabled={reportLoading}
              onClick={handleGenerateReport}
            >
              {reportLoading ? 'Generating…' : 'Generate Full Report'}
            </Button>
            {reportMessage ? (
              <p className="text-xs text-muted-foreground">{reportMessage}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Student progress overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 grid gap-4 sm:grid-cols-5">
            {BUCKET_FILTERS.map(({ key, label }) => (
              <div
                key={key}
                className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-4 text-center"
              >
                <p className="text-2xl font-semibold">
                  {studentBuckets[key as keyof typeof studentBuckets]}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {BUCKET_FILTERS.map(({ label, filter }) => (
              <Button key={filter} variant="outline" size="sm" asChild>
                <Link href={`/university/academics?tab=students&filter=${filter}`}>
                  View {label.toLowerCase()}
                </Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <PartnershipEcosystemPanel viewer="university" title="Company Partnerships" />

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity yet.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {recentActivity.map((item) => (
                <li key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                  <div className="min-w-0 flex-1">
                    {item.link ? (
                      <Link
                        href={item.link}
                        className="font-medium hover:text-brand transition-colors"
                      >
                        {item.title}
                      </Link>
                    ) : (
                      <p className="font-medium">{item.title}</p>
                    )}
                    {item.message ? (
                      <p className="mt-0.5 text-sm text-muted-foreground">{item.message}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
