'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Target } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { useI18n } from '@/lib/i18n/context';

interface CareerTarget {
  id: string;
  roleTitle: string;
  companyName: string | null;
  compatibility: number;
  isPrimary: boolean;
}

export function CompatibilityClient({
  targets,
}: {
  targets: CareerTarget[];
}) {
  const { tr } = useI18n();
  const router = useRouter();
  const [roleTitle, setRoleTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/career/targets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleTitle, companyName }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Failed to add target');
      return;
    }
    setRoleTitle('');
    setCompanyName('');
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title={tr('student.career.compatibility')}
        subtitle="Define your desired roles and track readiness over time."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Add career target</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <Input
                placeholder="e.g. Business Analyst"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                required
              />
              <Input
                placeholder="e.g. Deloitte (optional)"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? tr('common.loading') : 'Add target'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          {targets.length === 0 ? (
            <EmptyState
              icon={Target}
              title={tr('common.emptyState')}
              description="Add a career target to begin tracking your compatibility progression."
            />
          ) : (
            targets.map((target) => (
              <Card key={target.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold">{target.roleTitle}</p>
                      {target.companyName ? (
                        <p className="text-sm text-muted-foreground">{target.companyName}</p>
                      ) : null}
                    </div>
                    <Badge variant="brand">{Math.round(target.compatibility)}% compatible</Badge>
                  </div>
                  <Progress value={target.compatibility} className="mt-4" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    Compatibility updates as you enrich your profile, academics, and experience.
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
