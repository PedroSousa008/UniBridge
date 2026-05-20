'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { RoleRequirementsHub } from '@/lib/company/company-role-requirements';

function FitQualityBadge({ quality }: { quality: RoleRequirementsHub['roles'][0]['fitQuality'] }) {
  const map = {
    excellent: 'bg-emerald-500/15 text-emerald-800 border-emerald-500/30',
    strong: 'bg-brand/10 text-brand border-brand/30',
    building: 'bg-amber-500/10 text-amber-800 border-amber-500/30',
    needs_definition: 'bg-muted text-muted-foreground',
  };
  const labels = {
    excellent: 'Excellent fit',
    strong: 'Strong fit',
    building: 'Building',
    needs_definition: 'Define requirements',
  };
  return (
    <Badge variant="outline" className={cn('text-[10px]', map[quality])}>
      {labels[quality]}
    </Badge>
  );
}

function CompatRing({ value }: { value: number }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/40" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-brand transition-all duration-500"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums">
        {value}%
      </span>
    </div>
  );
}

export function CompanyRoleRequirementsHub({
  onBack,
  onOpenRole,
  onCreateRole,
}: {
  onBack: () => void;
  onOpenRole: (roleId: string) => void;
  onCreateRole: () => void;
}) {
  const [hub, setHub] = useState<RoleRequirementsHub | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/company/presence/requirements');
    if (res.ok) setHub(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loading && !hub) {
    return (
      <p className="py-20 text-center text-sm text-muted-foreground animate-pulse">
        Loading role requirements intelligence…
      </p>
    );
  }

  if (!hub) {
    return (
      <div className="py-16 text-center space-y-3">
        <p className="text-sm text-muted-foreground">Could not load requirements hub.</p>
        <Button size="sm" variant="outline" onClick={() => void refresh()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-400">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Company presence
        </Button>
      </div>

      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-8 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand/25 via-transparent to-transparent" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-brand-200 mb-2">
              <Sparkles className="h-5 w-5" />
              <span className="text-xs font-medium uppercase tracking-widest">Live compatibility intelligence</span>
            </div>
            <h2 className="text-3xl font-semibold tracking-tight">Role Requirements Hub</h2>
            <p className="mt-2 max-w-xl text-white/75 text-sm">
              Define what talent belongs at {hub.companyName}. UniBridge translates each role into live student
              compatibility across profiles, academics, startups, and events.
            </p>
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <p className="text-3xl font-bold tabular-nums">{hub.totalRoles}</p>
              <p className="text-[10px] uppercase tracking-wide text-white/60">Active roles</p>
            </div>
            <div>
              <p className="text-3xl font-bold tabular-nums">
                {hub.roles.filter((r) => r.openLabel === 'Open').length}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-white/60">Open positions</p>
            </div>
          </div>
        </div>
      </section>

      {hub.roles.length === 0 ? (
        <div className="rounded-3xl border border-dashed bg-gradient-to-br from-card to-muted/20 p-12 text-center">
          <Target className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold">No roles yet</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Create your first role to define requirements and discover compatible students.
          </p>
          <Button className="mt-6" variant="brand" onClick={onCreateRole}>
            <Plus className="h-4 w-4 mr-2" />
            Create role
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {hub.roles.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => onOpenRole(role.id)}
              className="group text-left rounded-2xl border bg-card p-5 transition hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5"
            >
              <div className="flex gap-4">
                <CompatRing value={role.compatibilityAverage} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-lg group-hover:text-brand transition-colors truncate">
                        {role.title}
                      </p>
                      {role.departmentName && (
                        <p className="text-xs text-muted-foreground mt-0.5">{role.departmentName}</p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-brand" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <FitQualityBadge quality={role.fitQuality} />
                    <Badge variant={role.openLabel === 'Open' ? 'default' : 'secondary'} className="text-[10px]">
                      {role.openLabel}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {role.hiringUrgencyLabel}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-muted/40 py-2">
                  <p className="text-sm font-semibold tabular-nums">{role.applicationCount}</p>
                  <p className="text-[10px] text-muted-foreground">Applications</p>
                </div>
                <div className="rounded-xl bg-muted/40 py-2">
                  <p className="text-sm font-semibold tabular-nums">{role.requirementsCompletion}%</p>
                  <p className="text-[10px] text-muted-foreground">Requirements</p>
                </div>
                <div className="rounded-xl bg-muted/40 py-2">
                  <Users className="h-3.5 w-3.5 mx-auto text-brand mb-0.5" />
                  <p className="text-[10px] text-muted-foreground">Tap to configure</p>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-brand transition-all"
                  style={{ width: `${role.requirementsCompletion}%` }}
                />
              </div>
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
        <TrendingUp className="h-3 w-3" />
        Changes update Talent, Pipeline, and student recommendations in real time.
      </p>
    </div>
  );
}
