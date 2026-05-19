'use client';

import { Activity, BarChart3, Building2, Globe, Rocket, Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ModuleGrid } from '@/components/layout/module-grid';
import { useI18n } from '@/lib/i18n/context';

interface EcosystemStats {
  totalUsers: number;
  students: number;
  teachers: number;
  universities: number;
  companies: number;
  startups: number;
}

export function OwnerEcosystemClient({ stats }: { stats: EcosystemStats }) {
  const { tr } = useI18n();

  const modules = [
    { href: '/owner/universities', label: tr('owner.nav.universities'), description: tr('common.comingSoon'), icon: Building2 },
    { href: '/owner/talent', label: tr('owner.nav.talent'), description: tr('common.comingSoon'), icon: Rocket },
    { href: '/owner/business', label: tr('owner.nav.business'), description: tr('common.comingSoon'), icon: BarChart3 },
    { href: '/owner/control', label: tr('owner.nav.control'), description: tr('common.comingSoon'), icon: Globe },
  ];

  const metrics = [
    { label: 'Total users', value: stats.totalUsers, icon: Users },
    { label: 'Students', value: stats.students, icon: Users },
    { label: 'Teachers', value: stats.teachers, icon: Users },
    { label: 'Universities', value: stats.universities, icon: Building2 },
    { label: 'Companies', value: stats.companies, icon: Building2 },
    { label: 'Startups', value: stats.startups, icon: Rocket },
  ];

  return (
    <div>
      <PageHeader
        title={tr('owner.ecosystem.title')}
        subtitle={tr('owner.ecosystem.subtitle')}
        badge="Owner OS"
      />
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="mb-8 border-brand/20 bg-gradient-to-br from-brand-muted/50 to-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-brand" />
            Ecosystem health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Advanced retention, engagement, and growth analytics will populate as the ecosystem scales.
          </p>
        </CardContent>
      </Card>
      <ModuleGrid items={modules} />
    </div>
  );
}
