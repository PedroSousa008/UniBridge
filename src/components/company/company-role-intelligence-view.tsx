'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Target, TrendingUp, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CompanyRoleIntelligenceView } from '@/lib/company/company-department-hub';
import { CompanyRolePanel } from '@/components/company/company-role-panel';

export function CompanyRoleIntelligenceScreen({
  roleId,
  onBack,
  onBackDepartment,
}: {
  roleId: string;
  onBack: () => void;
  onBackDepartment: () => void;
}) {
  const [view, setView] = useState<CompanyRoleIntelligenceView | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/company/presence/roles/${roleId}`);
    if (res.ok) setView(await res.json());
  }, [roleId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!view) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Loading role…</p>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-400">
      <div className="flex flex-wrap gap-2 text-sm">
        <Button variant="ghost" size="sm" onClick={onBackDepartment}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {view.departmentName ?? 'Department'}
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium">{view.title}</span>
      </div>

      <section className="rounded-3xl border bg-gradient-to-br from-card via-card to-muted/30 p-8">
        <Badge className="mb-3">{view.hero.hiringStatus}</Badge>
        <h2 className="text-3xl font-semibold tracking-tight">{view.title}</h2>
        <p className="text-muted-foreground mt-2 capitalize">
          {view.roleType.replace(/_/g, ' ')} · {view.remoteType}
          {view.location ? ` · ${view.location}` : ''}
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-4 text-center">
            <p className="text-3xl font-bold text-brand tabular-nums">{view.hero.avgCompatibility}%</p>
            <p className="text-xs text-muted-foreground">Avg compatibility</p>
          </div>
          <div className="rounded-xl border bg-card p-4 text-center">
            <p className="text-3xl font-bold tabular-nums">{view.hero.applicationCount}</p>
            <p className="text-xs text-muted-foreground">Applications</p>
          </div>
          <div className="rounded-xl border bg-card p-4 text-center">
            <p className="text-sm font-medium">Top skills</p>
            <p className="text-xs text-muted-foreground mt-1">{view.hero.strongestSkills.join(' · ')}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => setEditOpen(true)}>
          Edit role
        </Button>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Application pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {view.pipeline.map((p) => (
              <div key={p.stage} className="flex items-center justify-between text-sm">
                <span>{p.label}</span>
                <span className="font-semibold tabular-nums">{p.count}</span>
              </div>
            ))}
            <Button variant="brand" size="sm" className="w-full mt-3" asChild>
              <Link href="/company/pipeline">Open full pipeline</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-brand/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand" /> AI insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {view.aiInsights.map((line, i) => (
                <li key={i}>· {line}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <section>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="h-4 w-4" /> Top matching students
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {view.topStudents.map((s) => (
            <Card key={s.userId}>
              <CardContent className="py-4">
                <p className="font-medium text-sm">{s.name}</p>
                <p className="text-2xl font-bold text-brand tabular-nums mt-1">{s.compatibility}%</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{s.headline ?? 'Student'}</p>
              </CardContent>
            </Card>
          ))}
          {view.topStudents.length === 0 && (
            <p className="text-sm text-muted-foreground col-span-full">Applications will appear here with compatibility scores.</p>
          )}
        </div>
      </section>

      <section>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Target className="h-4 w-4" /> Recent applications
        </h3>
        <ul className="divide-y rounded-xl border">
          {view.applications.map((app) => (
            <li key={app.id} className="flex justify-between px-4 py-3 text-sm">
              <span className="font-medium">{app.studentName}</span>
              <span className="text-muted-foreground">
                {app.statusLabel} · {new Date(app.at).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {view.departmentId ? (
        <CompanyRolePanel
          open={editOpen}
          departmentId={view.departmentId}
          departmentName={view.departmentName ?? 'Department'}
          roleId={roleId}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            void refresh();
          }}
        />
      ) : null}
    </div>
  );
}
