'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Sparkles, Target, TrendingUp, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CompanyRoleIntelligenceView } from '@/lib/company/company-department-hub';
import { CompanyRolePanel } from '@/components/company/company-role-panel';

export function CompanyRoleIntelligenceScreen({
  roleId,
  initialView,
  onBack,
  onBackDepartment,
}: {
  roleId: string;
  initialView?: CompanyRoleIntelligenceView;
  onBack: () => void;
  onBackDepartment: () => void;
}) {
  const [view, setView] = useState<CompanyRoleIntelligenceView | null>(initialView ?? null);
  const [loading, setLoading] = useState(!initialView);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hiringSaving, setHiringSaving] = useState(false);
  const hasViewRef = useRef(Boolean(initialView));

  useEffect(() => {
    hasViewRef.current = Boolean(view);
  }, [view]);

  const refresh = useCallback(async (silent = false) => {
    if (!silent && !hasViewRef.current) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const res = await fetch(`/api/company/presence/roles/${roleId}`);
      if (res.ok) {
        setView(await res.json());
      } else {
        const body = await res.json().catch(() => ({}));
        if (!hasViewRef.current) setView(null);
        setError((body.error as string) ?? 'Could not load this role.');
      }
    } catch {
      if (!hasViewRef.current) setView(null);
      setError('Network error while loading the role.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [roleId]);

  useEffect(() => {
    void refresh(Boolean(initialView));
  }, [roleId, refresh, initialView]);

  async function setCurrentlyHiring(currentlyHiring: boolean) {
    if (!view || view.isFilled) return;
    setHiringSaving(true);
    try {
      const res = await fetch(`/api/company/presence/roles/${roleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setCurrentlyHiring', currentlyHiring }),
      });
      if (res.ok) setView(await res.json());
    } finally {
      setHiringSaving(false);
    }
  }

  if (loading && !view) {
    return (
      <div className="py-16 space-y-4 animate-pulse">
        <div className="h-8 w-56 rounded-lg bg-muted" />
        <div className="h-44 rounded-3xl bg-muted" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-36 rounded-xl bg-muted" />
          <div className="h-36 rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  if (!view) {
    return (
      <div className="py-16 text-center space-y-4">
        <p className="text-sm text-muted-foreground">{error ?? 'Role not found.'}</p>
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void refresh()}>
            Retry
          </Button>
          <Button variant="ghost" size="sm" onClick={onBackDepartment}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Button variant="ghost" size="sm" onClick={onBackDepartment}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {view.departmentName ?? 'Department'}
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium">{view.title}</span>
        {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : null}
      </div>

      <section className="rounded-3xl border bg-gradient-to-br from-card via-card to-muted/30 p-8">
        <Badge className="mb-3">{view.hero.hiringStatus}</Badge>
        <h2 className="text-3xl font-semibold tracking-tight">{view.title}</h2>
        <p className="text-muted-foreground mt-2 capitalize">
          {view.roleType.replace(/_/g, ' ')} · {view.remoteType}
          {view.location ? ` · ${view.location}` : ''}
        </p>
        {view.positionHolder ? (
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-muted/40 p-3 max-w-md">
            <div className="h-12 w-12 rounded-xl bg-muted overflow-hidden shrink-0">
              {view.positionHolder.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={view.positionHolder.photoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Users className="h-6 w-6 m-3 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium">{view.positionHolder.name}</p>
              <p className="text-xs text-muted-foreground">Current role holder</p>
            </div>
          </div>
        ) : null}
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
            <p className="text-xs text-muted-foreground mt-1">{view.hero.strongestSkills.join(' · ') || '—'}</p>
          </div>
        </div>
        {!view.isFilled ? (
          <div className="mt-5 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Recruitment status
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={view.currentlyHiring ? 'brand' : 'outline'}
                disabled={hiringSaving}
                onClick={() => void setCurrentlyHiring(true)}
              >
                Actively hiring
              </Button>
              <Button
                type="button"
                size="sm"
                variant={!view.currentlyHiring ? 'default' : 'outline'}
                className={cn(!view.currentlyHiring && 'border-amber-300/60 bg-amber-500/10')}
                disabled={hiringSaving}
                onClick={() => void setCurrentlyHiring(false)}
              >
                Not actively hiring
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Students can apply in both cases — this only changes how the role is labeled.
            </p>
          </div>
        ) : null}
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
            <p className="text-sm text-muted-foreground col-span-full">
              Applications will appear here with compatibility scores.
            </p>
          )}
        </div>
      </section>

      <section>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Target className="h-4 w-4" /> Recent applications
        </h3>
        <ul className="divide-y rounded-xl border">
          {view.applications.length === 0 ? (
            <li className="px-4 py-6 text-sm text-muted-foreground text-center">No applications yet.</li>
          ) : (
            view.applications.map((app) => (
              <li key={app.id} className="flex justify-between px-4 py-3 text-sm">
                <span className="font-medium">{app.studentName}</span>
                <span className="text-muted-foreground">
                  {app.statusLabel} · {new Date(app.at).toLocaleDateString()}
                </span>
              </li>
            ))
          )}
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
            void refresh(true);
          }}
        />
      ) : null}
    </div>
  );
}
