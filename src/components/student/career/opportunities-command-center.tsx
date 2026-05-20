'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Bell,
  Briefcase,
  Building2,
  Calendar,
  GitCompare,
  Loader2,
  MessageSquare,
  Sparkles,
  Star,
  Target,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { OpportunitiesHub } from '@/lib/student/student-opportunities-hub';
import type { OpportunityRow, OpportunityStage, StatusTone } from '@/lib/career/opportunities-intelligence';

const TONE_STYLES: Record<StatusTone, string> = {
  green: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  yellow: 'bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30',
  red: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
  blue: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
  neutral: 'bg-muted text-muted-foreground border-border',
};

function CompanyCell({ row }: { row: OpportunityRow }) {
  return (
    <div className="flex items-center gap-3 min-w-[140px]">
      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
        {row.companyLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.companyLogoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs font-semibold">{row.companyName.slice(0, 2).toUpperCase()}</span>
        )}
      </div>
      <div>
        <p className="font-medium text-sm">{row.companyName}</p>
        <p className="text-[10px] text-muted-foreground">{row.category.replace('_', ' ')}</p>
      </div>
    </div>
  );
}

function StageBadge({ row }: { row: OpportunityRow }) {
  return (
    <span className={cn('inline-flex text-xs font-medium px-2 py-0.5 rounded-full border', TONE_STYLES[row.statusTone])}>
      {row.stageLabel}
    </span>
  );
}

export function OpportunitiesCommandCenter({ initialHub }: { initialHub: OpportunitiesHub }) {
  const [hub, setHub] = useState(initialHub);
  const [stageFilter, setStageFilter] = useState<OpportunityStage | 'all'>('all');
  const [compareIds, setCompareIds] = useState<string[]>(initialHub.compareIds);
  const [loading, setLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiReply, setAiReply] = useState<string | null>(null);

  const fetchHub = useCallback(async () => {
    const params = new URLSearchParams();
    if (compareIds.length) params.set('compare', compareIds.join(','));
    const res = await fetch(`/api/student/career/opportunities?${params}`);
    if (res.ok) setHub(await res.json());
  }, [compareIds]);

  useEffect(() => {
    const t = setTimeout(() => void fetchHub(), 300);
    return () => clearTimeout(t);
  }, [fetchHub]);

  const filtered = useMemo(() => {
    if (stageFilter === 'all') return hub.pipeline;
    return hub.pipeline.filter((r) => r.stage === stageFilter);
  }, [hub.pipeline, stageFilter]);

  const compareRows = hub.pipeline.filter((r) => compareIds.includes(r.id));

  async function togglePriority(row: OpportunityRow) {
    setLoading(true);
    await fetch(`/api/student/career/opportunities/${row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority: !row.priority }),
    });
    await fetchHub();
    setLoading(false);
  }

  async function updateStage(row: OpportunityRow, stage: OpportunityStage) {
    setLoading(true);
    await fetch(`/api/student/career/opportunities/${row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    });
    await fetchHub();
    setLoading(false);
  }

  async function askAdvisor() {
    if (!aiPrompt.trim()) return;
    setLoading(true);
    const res = await fetch('/api/student/career/opportunities/advise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: aiPrompt }),
    });
    if (res.ok) setAiReply((await res.json()).reply);
    setLoading(false);
  }

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return [...prev.slice(1), id];
      return [...prev, id];
    });
  }

  return (
    <div className="space-y-10 pb-12">
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 p-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/15 via-transparent to-transparent" />
        <div className="relative flex flex-wrap justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-indigo-300 font-medium">
              <Briefcase className="h-4 w-4" />
              Career pipeline
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Your professional opportunity command center</h2>
            <p className="mt-2 text-sm text-slate-300 max-w-xl">
              Every application from Internships & Partnerships syncs here automatically — with compatibility, interviews,
              and AI prioritization.
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-semibold">{hub.analytics.activeCount}</p>
            <p className="text-xs text-slate-400">active opportunities</p>
          </div>
        </div>
        <div className="relative mt-4 flex flex-wrap gap-2">
          <Link href="/student/career/partnerships" className="text-xs rounded-full bg-white/10 px-3 py-1 border border-white/20 hover:bg-white/20">
            Browse partnerships
          </Link>
          <Link href="/student/career/internships" className="text-xs rounded-full bg-white/10 px-3 py-1 border border-white/20 hover:bg-white/20">
            Internships
          </Link>
          <Link href="/student/career/compatibility" className="text-xs rounded-full bg-white/10 px-3 py-1 border border-white/20 hover:bg-white/20">
            Compatibility
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Pipeline total</p>
            <p className="text-2xl font-semibold">{hub.analytics.totalPipeline}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Success rate</p>
            <p className="text-2xl font-semibold">{hub.analytics.applicationSuccessRate ?? '—'}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Interview conversion</p>
            <p className="text-2xl font-semibold text-brand">{hub.analytics.interviewConversion ?? '—'}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Avg compatibility</p>
            <p className="text-2xl font-semibold">{hub.analytics.compatibilityAverage}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Best role</p>
            <p className="text-sm font-medium line-clamp-2 mt-1">{hub.analytics.bestRole ?? '—'}</p>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">Opportunity pipeline</h3>
            <div className="flex flex-wrap gap-1">
              <Button size="sm" variant={stageFilter === 'all' ? 'default' : 'outline'} onClick={() => setStageFilter('all')}>
                All
              </Button>
              {hub.stages.slice(0, 6).map((s) => (
                <Button
                  key={s.id}
                  size="sm"
                  variant={stageFilter === s.id ? 'default' : 'outline'}
                  onClick={() => setStageFilter(s.id)}
                >
                  {s.label}
                  {hub.byStage[s.id] > 0 && (
                    <span className="ml-1 opacity-70">({hub.byStage[s.id]})</span>
                  )}
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border/60 overflow-hidden bg-card/50">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                    <th className="p-3 font-medium">Company</th>
                    <th className="p-3 font-medium">Role</th>
                    <th className="p-3 font-medium">Stage</th>
                    <th className="p-3 font-medium">Fit</th>
                    <th className="p-3 font-medium">Salary</th>
                    <th className="p-3 font-medium">Interview</th>
                    <th className="p-3 font-medium">Next action</th>
                    <th className="p-3 font-medium w-8">★</th>
                    <th className="p-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-muted-foreground">
                        Save roles from{' '}
                        <Link href="/student/career/partnerships" className="text-brand underline">
                          Partnerships
                        </Link>{' '}
                        or apply to internships — they appear here instantly.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row) => (
                      <tr key={row.id} className="border-b border-border/40 hover:bg-muted/20 transition">
                        <td className="p-3">
                          <CompanyCell row={row} />
                        </td>
                        <td className="p-3">
                          <p className="font-medium">{row.role}</p>
                          {row.applicationDate && (
                            <p className="text-[10px] text-muted-foreground">
                              Applied {new Date(row.applicationDate).toLocaleDateString()}
                            </p>
                          )}
                        </td>
                        <td className="p-3">
                          <select
                            className="text-xs rounded-md border bg-background px-2 py-1"
                            value={row.stage}
                            onChange={(e) => void updateStage(row, e.target.value as OpportunityStage)}
                            disabled={loading}
                          >
                            {hub.stages.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-brand">{row.compatibility}%</span>
                        </td>
                        <td className="p-3 text-muted-foreground">{row.salaryRange ?? '—'}</td>
                        <td className="p-3 text-xs">{row.interviewStatus}</td>
                        <td className="p-3 text-xs text-muted-foreground max-w-[160px] line-clamp-2">{row.nextAction}</td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => void togglePriority(row)}
                            className={cn(row.priority && 'text-amber-500')}
                            aria-label="Toggle priority"
                          >
                            <Star className={cn('h-4 w-4', row.priority && 'fill-current')} />
                          </button>
                        </td>
                        <td className="p-3">
                          <Link href={row.href}>
                            <Button size="sm" variant="ghost">
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI prioritization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {hub.aiPrioritized.map((r) => (
                <div key={r.id} className="text-sm border-l-2 border-brand/40 pl-3">
                  <p className="font-medium">{r.role}</p>
                  <p className="text-xs text-muted-foreground">{r.aiPriorityLabel}</p>
                  <p className="text-[10px] text-brand mt-0.5">Score {r.aiPriorityScore}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Smart notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-48 overflow-y-auto">
              {hub.notifications.length === 0 ? (
                <p className="text-xs text-muted-foreground">No urgent alerts — you&apos;re on track.</p>
              ) : (
                hub.notifications.map((n) => (
                  <Link key={n.id} href={n.href} className="block text-xs hover:text-brand">
                    <span
                      className={cn(
                        'inline-block w-1.5 h-1.5 rounded-full mr-2',
                        n.urgency === 'high' ? 'bg-red-500' : n.urgency === 'medium' ? 'bg-amber-500' : 'bg-muted'
                      )}
                    />
                    {n.text}
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <GitCompare className="h-4 w-4" />
              Compare opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">Select up to 3 from the pipeline table (use checkboxes below)</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {hub.pipeline.slice(0, 8).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => toggleCompare(r.id)}
                  className={cn(
                    'text-xs px-2 py-1 rounded-full border',
                    compareIds.includes(r.id) ? 'border-brand bg-brand/10' : 'border-border'
                  )}
                >
                  {r.companyName.slice(0, 12)}
                </button>
              ))}
            </div>
            {compareRows.length >= 2 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Criteria</th>
                      {compareRows.map((r) => (
                        <th key={r.id} className="text-left p-2">
                          {r.role.slice(0, 20)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Compatibility', get: (r: OpportunityRow) => `${r.compatibility}%` },
                      { label: 'Salary', get: (r: OpportunityRow) => r.salaryRange ?? '—' },
                      { label: 'Stage', get: (r: OpportunityRow) => r.stageLabel },
                      { label: 'Growth signal', get: (r: OpportunityRow) => (r.aiPriorityScore >= 75 ? 'High' : 'Medium') },
                      { label: 'Flexibility', get: (r: OpportunityRow) => r.location ?? '—' },
                    ].map((row) => (
                      <tr key={row.label} className="border-b border-border/40">
                        <td className="p-2 text-muted-foreground">{row.label}</td>
                        {compareRows.map((r) => (
                          <td key={r.id} className="p-2">
                            {row.get(r)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select at least 2 opportunities to compare.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-64 overflow-y-auto">
            {hub.timeline.map((ev) => (
              <div key={ev.id} className="flex gap-3 text-sm">
                <div className="w-16 shrink-0 text-[10px] text-muted-foreground">
                  {new Date(ev.date).toLocaleDateString()}
                </div>
                <div>
                  <p className="font-medium">{ev.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {ev.role} · {ev.companyName}
                  </p>
                  <Link href={ev.href} className="text-xs text-brand">
                    Open workspace
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Saved watchlist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {hub.saved.length === 0 ? (
              <p className="text-sm text-muted-foreground">Bookmark roles to build your watchlist.</p>
            ) : (
              hub.saved.slice(0, 6).map((r) => (
                <Link key={r.id} href={r.href} className="flex justify-between items-center text-sm hover:text-brand">
                  <span>
                    {r.role} · {r.companyName}
                  </span>
                  <StageBadge row={r} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              AI pipeline advisor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Which opportunity should I prioritize?"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void askAdvisor()}
              />
              <Button onClick={() => void askAdvisor()} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
              </Button>
            </div>
            {aiReply && <p className="text-sm rounded-lg bg-muted p-3">{aiReply}</p>}
          </CardContent>
        </Card>
      </section>

      <section>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Categories</h3>
        <div className="flex flex-wrap gap-2">
          {hub.categories.map((c) => (
            <Badge key={c.id} variant="secondary">
              {c.label} ({c.count})
            </Badge>
          ))}
        </div>
      </section>
    </div>
  );
}
