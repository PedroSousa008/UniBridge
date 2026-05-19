'use client';

import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function OwnerBusinessClient({
  totalUsers,
  roleCounts,
}: {
  totalUsers: number;
  roleCounts: Record<string, number>;
}) {
  const metrics = [
    { label: 'Total ecosystem users', value: totalUsers },
    { label: 'Students', value: roleCounts.STUDENT ?? 0 },
    { label: 'Teachers', value: roleCounts.TEACHER ?? 0 },
    { label: 'Universities', value: roleCounts.UNIVERSITY ?? 0 },
    { label: 'Companies', value: roleCounts.COMPANY ?? 0 },
    { label: 'Owners', value: roleCounts.OWNER ?? 0 },
  ];

  return (
    <div>
      <PageHeader
        title="Business"
        subtitle="MRR, subscriptions, churn, and enterprise pipeline."
        badge="Owner OS"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">{m.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">
            Revenue metrics (MRR, ARR, subscriptions, churn) will activate once
            billing is connected. User counts above reflect live ecosystem data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
