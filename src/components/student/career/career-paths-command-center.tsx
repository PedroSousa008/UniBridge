'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  CheckCircle2,
  Circle,
  GitCompare,
  Loader2,
  Sparkles,
  Star,
  Target,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { CareerPathCard, CareerPathsHub } from '@/lib/student/student-career-paths';
import { ProgressRing } from '@/components/student/home/progress-ring';

const DIFFICULTY_LABEL = {
  accessible: 'Accessible',
  moderate: 'Moderate',
  challenging: 'Challenging',
};

const DEMAND_LABEL = { high: 'High demand', medium: 'Steady demand', low: 'Emerging' };

function PathCard({
  path,
  selected,
  compare,
  onSelect,
  onToggleCompare,
}: {
  path: CareerPathCard;
  selected: boolean;
  compare: boolean;
  onSelect: () => void;
  onToggleCompare: () => void;
}) {
  return (
    <Card
      className={cn(
        'cursor-pointer border-border/60 transition-all hover:shadow-md',
        selected && 'ring-2 ring-brand/40 shadow-md',
        path.isPrimaryTarget && 'border-brand/30'
      )}
      onClick={onSelect}
    >
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {path.isProfileInsight ? (
                <Badge variant="secondary" className="text-[10px]">Profile insight</Badge>
              ) : (
                <Badge variant="brand" className="text-[10px]">{path.companyName}</Badge>
              )}
              {path.isPrimaryTarget ? (
                <Badge className="text-[10px] bg-brand/10 text-brand border-brand/20">Primary goal</Badge>
              ) : null}
            </div>
            <h3 className="mt-2 font-semibold tracking-tight">{path.roleTitle}</h3>
            {path.industry ? (
              <p className="text-sm text-muted-foreground">{path.industry}</p>
            ) : null}
          </div>
          <ProgressRing value={path.compatibility} size={72} stroke={6} label="" />
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {path.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px] font-normal">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <span>{DEMAND_LABEL[path.demandLevel]}</span>
          <span className="capitalize">{path.growthTrend} growth</span>
          <span>{DIFFICULTY_LABEL[path.pathDifficulty]}</span>
          {path.salaryStarting ? (
            <span>From €{path.salaryStarting.toLocaleString()}</span>
          ) : (
            <span>Salary TBD</span>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCompare();
            }}
            className={cn(
              'text-xs font-medium',
              compare ? 'text-brand' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <GitCompare className="mr-1 inline h-3.5 w-3.5" />
            Compare
          </button>
          {path.monthlyTrend != null && path.monthlyTrend !== 0 ? (
            <span className={cn('text-xs font-medium', path.monthlyTrend > 0 ? 'text-emerald-600' : 'text-amber-600')}>
              {path.monthlyTrend > 0 ? '+' : ''}
              {path.monthlyTrend}% this month
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function RoadmapViz({ stages }: { stages: CareerPathCard['roadmapStages'] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {stages.map((s, i) => (
        <div key={s.stage} className="flex items-center gap-2">
          <div
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium',
              s.status === 'done' && 'bg-emerald-500/10 text-emerald-700',
              s.status === 'current' && 'bg-brand/10 text-brand ring-1 ring-brand/20',
              s.status === 'upcoming' && 'bg-muted text-muted-foreground'
            )}
          >
            {s.status === 'done' ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <Circle className="h-3.5 w-3.5" />
            )}
            {s.stage}
          </div>
          {i < stages.length - 1 ? (
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function CareerPathsCommandCenter({ initialHub }: { initialHub: CareerPathsHub }) {
  const [hub, setHub] = useState(initialHub);
  const [selectedId, setSelectedId] = useState(initialHub.bestFit?.id ?? null);
  const [compareIds, setCompareIds] = useState<string[]>(initialHub.comparisonDefaults);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const selected = useMemo(
    () => hub.paths.find((p) => p.id === selectedId) ?? hub.bestFit,
    [hub, selectedId]
  );

  const comparePaths = useMemo(
    () => hub.paths.filter((p) => compareIds.includes(p.id)),
    [hub.paths, compareIds]
  );

  useEffect(() => {
    const t = setInterval(() => {
      fetch('/api/student/career/paths')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.paths) setHub(data);
        });
    }, 60_000);
    return () => clearInterval(t);
  }, []);

  const refresh = useCallback(async () => {
    const res = await fetch('/api/student/career/paths');
    if (res.ok) setHub(await res.json());
  }, []);

  async function setAsTarget(path: CareerPathCard, primary = false) {
    setSaving(true);
    await fetch('/api/career/targets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roleTitle: path.roleTitle,
        companyName: path.isProfileInsight ? null : path.companyName,
        careerPathId: path.isProfileInsight ? null : path.id,
        compatibility: path.compatibility,
        missingRequirements: path.missingSkills,
        setPrimary: primary,
      }),
    });
    setSaving(false);
    await refresh();
  }

  async function askAi(prompt: string) {
    setAiPrompt(prompt);
    setAiLoading(true);
    setAiReply(null);
    const res = await fetch('/api/student/career/paths/advise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (res.ok) {
      const data = await res.json();
      setAiReply(data.reply);
    } else {
      setAiReply('Keep building your profile — personalized guidance improves with activity.');
    }
    setAiLoading(false);
  }

  const aiSuggestions = [
    'What should I prioritize next?',
    'Which skills are slowing my progress?',
    'Most realistic high-income path for me?',
    'Compare my top career paths',
  ];

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  return (
    <div className="space-y-10 pb-12">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-background via-background to-violet-500/5 p-8 shadow-sm">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="text-sm font-medium text-brand">Best careers for you</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
              {hub.bestFit ? hub.bestFit.roleTitle : 'Your career roadmap'}
            </h2>
            <p className="mt-2 max-w-xl text-muted-foreground">
              {hub.hasCompanyPaths
                ? 'Compatibility scores reflect company-defined requirements matched against your real UniBridge activity.'
                : 'Company paths appear when partners publish roles. Until then, profile-based directions evolve with your academics, startup activity, and profile.'}
            </p>
            {hub.bestFit ? (
              <ul className="mt-4 space-y-1.5">
                {hub.bestFit.whyMatches.slice(0, 2).map((w) => (
                  <li key={w} className="flex items-start gap-2 text-sm">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    {w}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          {hub.bestFit ? (
            <div className="flex flex-col items-center">
              <ProgressRing value={hub.bestFit.compatibility} label="Best fit" />
              <p className="mt-2 text-xs text-muted-foreground text-center max-w-[160px]">
                Updates as grades, attendance, and profile change
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {!hub.hasCompanyPaths ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-5 py-4 text-sm text-muted-foreground">
          <Briefcase className="mb-2 h-5 w-5 text-brand" />
          <p className="font-medium text-foreground">Company career paths coming soon</p>
          <p className="mt-1">
            When companies join UniBridge and publish roles with requirements, your compatibility % will be
            calculated against their exact must-haves. Profile insights below are driven by your real data today.
          </p>
        </div>
      ) : null}

      {/* Ranked paths */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <h3 className="text-lg font-semibold">Personalized career paths</h3>
          <span className="text-sm text-muted-foreground">{hub.paths.length} ranked for you</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {hub.paths.map((path) => (
            <PathCard
              key={path.id}
              path={path}
              selected={selected?.id === path.id}
              compare={compareIds.includes(path.id)}
              onSelect={() => setSelectedId(path.id)}
              onToggleCompare={() => toggleCompare(path.id)}
            />
          ))}
        </div>
      </section>

      {/* Selected path detail */}
      {selected ? (
        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-border/60">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle>{selected.roleTitle}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selected.isProfileInsight ? 'Profile-based direction' : selected.companyName}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={saving}
                    onClick={() => setAsTarget(selected, false)}
                  >
                    <Star className="mr-1.5 h-4 w-4" />
                    Save
                  </Button>
                  <Button size="sm" disabled={saving} onClick={() => setAsTarget(selected, true)}>
                    <Target className="mr-1.5 h-4 w-4" />
                    Set as goal
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {selected.description ? (
                <p className="text-sm text-muted-foreground">{selected.description}</p>
              ) : null}

              <div>
                <p className="text-sm font-medium mb-2">Why this matches you</p>
                <ul className="space-y-2">
                  {selected.whyMatches.map((w) => (
                    <li key={w} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                      {w}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-sm font-medium mb-3">Career roadmap</p>
                <RoadmapViz stages={selected.roadmapStages} />
              </div>

              <div>
                <p className="text-sm font-medium mb-2">A day in the life</p>
                <div className="grid gap-3 sm:grid-cols-2 text-sm">
                  <div className="rounded-lg border border-border/60 p-3">
                    <p className="text-xs text-muted-foreground">Work style</p>
                    <p className="mt-1">{selected.simulation.workStyle}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 p-3">
                    <p className="text-xs text-muted-foreground">Stress level</p>
                    <p className="mt-1">{selected.simulation.stressLevel}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 p-3">
                    <p className="text-xs text-muted-foreground">Remote flexibility</p>
                    <p className="mt-1">{selected.simulation.remoteFlex}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 p-3">
                    <p className="text-xs text-muted-foreground">Meetings</p>
                    <p className="mt-1">{selected.simulation.meetingLoad}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Skills gap</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-center">
                  <p className="text-3xl font-semibold">{selected.compatibility}%</p>
                  <p className="text-xs text-muted-foreground">role compatibility</p>
                </div>
                {selected.missingSkills.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Strong alignment with current requirements.</p>
                ) : (
                  selected.missingSkills.map((s) => (
                    <div key={s.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span>{s.name}</span>
                        <span className="text-muted-foreground">{s.gapPercent}% gap</span>
                      </div>
                      <Progress value={100 - s.gapPercent} className="h-1.5" />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Salary projection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Starting</span>
                  <span>{selected.salaryStarting ? `€${selected.salaryStarting.toLocaleString()}` : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">5-year</span>
                  <span>{selected.salaryFiveYear ? `€${selected.salaryFiveYear.toLocaleString()}` : '—'}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-muted-foreground">10-year</span>
                  <span>{selected.salaryTenYear ? `€${selected.salaryTenYear.toLocaleString()}` : '—'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      ) : null}

      {/* Comparison */}
      {comparePaths.length >= 2 ? (
        <section>
          <h3 className="text-lg font-semibold mb-4">Path comparison</h3>
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Metric</th>
                  {comparePaths.map((p) => (
                    <th key={p.id} className="px-4 py-3 text-left font-medium">
                      {p.roleTitle}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Compatibility', get: (p: CareerPathCard) => `${p.compatibility}%` },
                  { label: 'Starting salary', get: (p: CareerPathCard) => p.salaryStarting ? `€${p.salaryStarting.toLocaleString()}` : '—' },
                  { label: '10-yr projection', get: (p: CareerPathCard) => p.salaryTenYear ? `€${p.salaryTenYear.toLocaleString()}` : '—' },
                  { label: 'Difficulty', get: (p: CareerPathCard) => DIFFICULTY_LABEL[p.pathDifficulty] },
                  { label: 'Demand', get: (p: CareerPathCard) => DEMAND_LABEL[p.demandLevel] },
                  { label: 'Growth', get: (p: CareerPathCard) => p.growthTrend },
                  { label: 'Skills gap', get: (p: CareerPathCard) => `${p.missingSkills.length} areas` },
                ].map((row) => (
                  <tr key={row.label} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 text-muted-foreground">{row.label}</td>
                    {comparePaths.map((p) => (
                      <td key={p.id} className="px-4 py-3">
                        {row.get(p)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* Subject connections */}
      {hub.subjectInsights.length > 0 ? (
        <section>
          <h3 className="text-lg font-semibold mb-4">Subject-to-career connections</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {hub.subjectInsights.map((s) => (
              <Card key={s.subjectName} className="border-border/60">
                <CardContent className="py-4">
                  <p className="font-medium">{s.subjectName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{s.message}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {s.careers.map((c) => (
                      <Badge key={c} variant="secondary" className="text-[10px] font-normal">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {/* Milestones */}
      {selected ? (
        <section>
          <div className="mb-4 flex items-end justify-between">
            <h3 className="text-lg font-semibold">Career milestones</h3>
            <span className="text-sm text-muted-foreground">
              {hub.milestonesSummary.done}/{hub.milestonesSummary.total} complete
            </span>
          </div>
          <div className="space-y-2">
            {selected.milestones.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'flex items-center justify-between rounded-xl border px-4 py-3',
                  m.done ? 'border-emerald-200/60 bg-emerald-50/30' : 'border-border/60'
                )}
              >
                <div className="flex items-center gap-3">
                  {m.done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="text-sm">{m.text}</span>
                </div>
                {m.href && !m.done ? (
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={m.href}>Start</Link>
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Evolution graphs */}
      <section>
        <h3 className="text-lg font-semibold mb-4">Career evolution</h3>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Compatibility evolution
              </CardTitle>
            </CardHeader>
            <CardContent className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hub.evolution.compatibilityTrend}>
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--brand))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Employability projection
              </CardTitle>
            </CardHeader>
            <CardContent className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hub.evolution.employabilityTrend}>
                  <defs>
                    <linearGradient id="empGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="#8b5cf6" fill="url(#empGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Alumni */}
      {hub.alumniExamples.length > 0 ? (
        <section>
          <h3 className="text-lg font-semibold mb-4">University alumni paths</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {hub.alumniExamples.map((a) => (
              <Card key={a.roleTitle} className="border-border/60">
                <CardContent className="py-4">
                  <p className="font-medium">{a.roleTitle}</p>
                  <p className="text-sm text-muted-foreground mt-1">{a.note}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {/* AI Advisor */}
      <section>
        <h3 className="text-lg font-semibold mb-4">AI career advisor</h3>
        <Card className="border-border/60">
          <CardContent className="space-y-4 py-6">
            <div className="flex flex-wrap gap-2">
              {aiSuggestions.map((s) => (
                <Button key={s} variant="outline" size="sm" onClick={() => askAi(s)} disabled={aiLoading}>
                  {s}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Ask your career mentor…"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && aiPrompt.trim() && askAi(aiPrompt)}
              />
              <Button onClick={() => aiPrompt.trim() && askAi(aiPrompt)} disabled={aiLoading}>
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ask'}
              </Button>
            </div>
            {aiReply ? (
              <p className="rounded-lg bg-muted/50 px-4 py-3 text-sm leading-relaxed">{aiReply}</p>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
