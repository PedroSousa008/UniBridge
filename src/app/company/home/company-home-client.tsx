'use client';

import { BarChart3, Search, Target, Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ModuleGrid } from '@/components/layout/module-grid';
import { useI18n } from '@/lib/i18n/context';

export function CompanyHomeClient({
  stats,
}: {
  stats: { students: number; startups: number };
}) {
  const { tr } = useI18n();

  const modules = [
    { href: '/company/talent', label: tr('company.nav.talent'), description: tr('common.comingSoon'), icon: Search },
    { href: '/company/opportunities', label: tr('company.nav.opportunities'), description: tr('common.comingSoon'), icon: Target },
    { href: '/company/insights', label: tr('company.nav.insights'), description: tr('common.comingSoon'), icon: BarChart3 },
  ];

  return (
    <div>
      <PageHeader
        title={tr('company.home.title')}
        subtitle={tr('company.home.subtitle')}
      />
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Students in ecosystem</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats.students}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Startup founders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats.startups}</p>
          </CardContent>
        </Card>
      </div>
      <ModuleGrid items={modules} />
    </div>
  );
}
