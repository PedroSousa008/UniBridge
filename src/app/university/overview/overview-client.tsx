'use client';

import { BarChart3, Building2, GraduationCap, Rocket, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ModuleGrid } from '@/components/layout/module-grid';
import { useI18n } from '@/lib/i18n/context';

export function UniversityOverviewClient({
  stats,
}: {
  stats: { students: number; teachers: number; startups: number };
}) {
  const { tr } = useI18n();

  const modules = [
    { href: '/university/academics', label: tr('university.nav.academics'), description: tr('common.comingSoon'), icon: GraduationCap },
    { href: '/university/career', label: tr('university.nav.career'), description: tr('common.comingSoon'), icon: Building2 },
    { href: '/university/innovation', label: tr('university.nav.innovation'), description: tr('common.comingSoon'), icon: Rocket },
  ];

  return (
    <div>
      <PageHeader
        title={tr('university.overview.title')}
        subtitle={tr('university.overview.subtitle')}
      />
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        {[
          { label: 'Students in ecosystem', value: stats.students },
          { label: 'Teachers in ecosystem', value: stats.teachers },
          { label: 'Active startups', value: stats.startups },
        ].map((item) => (
          <Card key={item.label}>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">{item.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{tr('common.comingSoon')}</p>
        </CardContent>
      </Card>
      <ModuleGrid items={modules} />
    </div>
  );
}
