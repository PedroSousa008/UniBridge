'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Brain,
  Loader2,
  Radio,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type {
  CompatibilityEntityType,
  CompatibilityHub,
  CompatibilityScoreItem,
} from '@/lib/student/student-compatibility-hub';
import { ProgressRing } from '@/components/student/home/progress-ring';

const TYPE_LABELS: Record<CompatibilityEntityType, string> = {
  career: 'Careers',
  internship: 'Internships',
  company: 'Companies',
  startup_join: 'Startups',
  program: 'Programs',
  opportunity: 'Opportunities',
};

const FILTERS: (CompatibilityEntityType | 'all')[] = [
  'all',
  'career',
  'internship',
  'company',
  'startup_join',
  'opportunity',
];

function ScoreCard({
  item,
  selected,
  onSelect,
}: {
  item: CompatibilityScoreItem;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full rounded-xl border border-border/60 bg-card p-4 text-left transition-all hover:shadow-md',
        selected && 'ring-2 ring-brand/40 shadow-md'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Badge variant="secondary" className="text-[10px] mb-2">
            {TYPE_LABELS[item.type]}
          </Badge>
          <p className="font-semibold tracking-tight line-clamp-1">{item.title}</p>
          {item.subtitle ? (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.subtitle}</p>
          ) : null}
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-semibold tabular-nums">{item.compatibility}%</p>
          {item.delta != null && item.delta !== 0 ? (
            <p
              className={cn(
                'text-[10px] font-medium flex items-center justify-end gap-0.5',
                item.delta > 0 ? 'text-emerald-600' : 'text-amber-600'
              )}
            >
              {item.delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {item.delta > 0 ? '+' : ''}
              {item.delta}%
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {item.tags.slice(0, 3).map((t) => (
          <Badge key={t} variant="outline" className="text-[10px] font-normal">
            {t}
          </Badge>
        ))}
      </div>
    </button>
  );
}

export function CompatibilityCommandCenter({ initialHub }: { initialHub: CompatibilityHub }) {
  const [hub, setHub] = useState(initialHub);
  const [selectedId, setSelectedId] = useState(initialHub.selectedId);
  const [filter, setFilter] = useState<CompatibilityEntityType | 'all'>('all');
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizSaving, setQuizSaving] = useState(false);
  const [live, setLive] = useState(true);

  const selected = useMemo(
    () => hub.scores.find((s) => s.id === selectedId) ?? hub.scores[0] ?? null,
    [hub.scores, selectedId]
  );

  const filteredScores = useMemo(() => {
    if (filter === 'all') return hub.scores;
    return hub.scores.filter((s) => s.type === filter);
  }, [hub.scores, filter]);

  const fetchHub = useCallback(async (sel?: string | null) => {
    const params = sel ? `?selectedId=${encodeURIComponent(sel)}` : '';
    const res = await fetch(`/api/student/career/compatibility${params}`);
    if (res.ok) setHub(await res.json());
  }, []);

  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => fetchHub(selectedId), 45_000);
    return () => clearInterval(t);
  }, [live, selectedId, fetchHub]);

  function selectScore(id: string) {
    setSelectedId(id);
    void fetchHub(id);
  }

  async function submitQuiz() {
    setQuizSaving(true);
    const res = await fetch('/api/student/career/compatibility/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: quizAnswers }),
    });
    if (res.ok) {
      const data = await res.json();
      setHub(data);
    }
    setQuizSaving(false);
  }

  const quizComplete = hub.quizQuestions.every((q) => quizAnswers[q.id] || hub.quizCompleted);

  return (
    <div className="space-y-10 pb-12">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-background via-background to-blue-500/5 p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex-1 min-w-[240px]">
            <div className="flex items-center gap-2 text-sm text-brand font-medium">
              <Radio className={cn('h-4 w-4', live && 'animate-pulse')} />
              Live career intelligence
              <button
                type="button"
                className="text-xs text-muted-foreground underline ml-2"
                onClick={() => setLive((v) => !v)}
              >
                {live ? 'Pause' : 'Resume'}
              </button>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              How close are you to the future you want?
            </h2>
            {hub.primaryGoal ? (
              <p className="mt-2 text-muted-foreground">
                Primary goal: <span className="font-medium text-foreground">{hub.primaryGoal.roleTitle}</span>{' '}
                · {hub.primaryGoal.compatibility}% compatible
              </p>
            ) : (
              <p className="mt-2 text-muted-foreground">
                Set a goal on{' '}
                <Link href="/student/career/paths" className="text-brand underline">
                  Career Paths
                </Link>{' '}
                to optimize recommendations.
              </p>
            )}
            {hub.liveDeltas.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {hub.liveDeltas.map((d) => (
                  <Badge
                    key={d.label}
                    variant="secondary"
                    className={cn('text-xs', d.delta > 0 ? 'text-emerald-700' : 'text-amber-700')}
                  >
                    {d.label} {d.delta > 0 ? '+' : ''}
                    {d.delta}%
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <ProgressRing value={hub.overallScore} label="Overall" size={100} stroke={8} />
            </div>
            <div className="text-center">
              <ProgressRing value={hub.employabilityScore} label="Employability" size={100} stroke={8} />
            </div>
          </div>
        </div>
      </section>

      {!hub.hasCompanyData ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-5 py-4 text-sm text-muted-foreground">
          Company and internship scores refine automatically when partners publish roles with real requirements.
          Profile-based analysis is active now.
        </div>
      ) : null}

      {/* Scores grid */}
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-lg font-semibold">Dynamic compatibility scores</h3>
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {f === 'all' ? 'All' : TYPE_LABELS[f]}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredScores.map((item) => (
            <ScoreCard
              key={item.id}
              item={item}
              selected={selected?.id === item.id}
              onSelect={() => selectScore(item.id)}
            />
          ))}
        </div>
      </section>

      {/* Selected detail */}
      {selected ? (
        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-4">
                <span>{selected.title}</span>
                <span className="text-2xl font-semibold text-brand">{selected.compatibility}%</span>
              </CardTitle>
              {selected.subtitle ? (
                <p className="text-sm text-muted-foreground">{selected.subtitle}</p>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-brand" />
                  Why this score?
                </p>
                <ul className="space-y-2">
                  {selected.whyMatches.map((w) => (
                    <li key={w} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                      {w}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-sm font-medium mb-3">Compatibility breakdown</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {selected.breakdown.map((b) => (
                    <div key={b.id}>
                      <div className="flex justify-between text-xs mb-1">
                        <span>{b.label}</span>
                        <span
                          className={cn(
                            b.status === 'strong' && 'text-emerald-600',
                            b.status === 'gap' && 'text-amber-600'
                          )}
                        >
                          {b.score}%
                        </span>
                      </div>
                      <Progress value={b.score} className="h-1.5" />
                    </div>
                  ))}
                </div>
              </div>

              {selected.missingRequirements.length > 0 ? (
                <div>
                  <p className="text-sm font-medium mb-2">
                    To reach {selected.targetScore}% compatibility
                  </p>
                  <ul className="space-y-2">
                    {selected.missingRequirements.map((m) => (
                      <li
                        key={m.name}
                        className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
                      >
                        <span>{m.name}</span>
                        <span className="text-xs text-muted-foreground">{m.gapPercent}% gap</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {hub.simulations.length > 0 ? (
                <div>
                  <p className="text-sm font-medium mb-3">Compatibility simulation</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {hub.simulations.map((sim) => (
                      <div
                        key={sim.id}
                        className="rounded-xl border border-border/60 p-3 hover:bg-muted/30 transition-colors"
                      >
                        <p className="text-sm font-medium">{sim.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">{sim.description}</p>
                        <p className="mt-2 text-sm">
                          <span className="text-muted-foreground">{sim.baseScore}%</span>
                          <ArrowRight className="inline h-3.5 w-3.5 mx-1 text-brand" />
                          <span className="font-semibold text-brand">{sim.projectedScore}%</span>
                          <span className="text-emerald-600 text-xs ml-1">(+{sim.deltaPercent})</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border-brand/20 bg-brand/5">
              <CardContent className="py-5">
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-brand shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Best next step</p>
                    <p className="text-sm text-muted-foreground mt-1">{hub.bestNextStep}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">AI recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {hub.recommendations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Keep building — recommendations evolve with activity.</p>
                ) : (
                  hub.recommendations.map((r) => (
                    <Link
                      key={r.id}
                      href={r.href}
                      className="block rounded-lg border border-border/60 px-3 py-2 hover:bg-muted/40 transition-colors"
                    >
                      <p className="text-sm font-medium">{r.text}</p>
                      <p className="text-xs text-brand mt-0.5">{r.impact}</p>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>

            <Button variant="outline" className="w-full" asChild>
              <Link href="/student/career/paths">
                <Target className="mr-2 h-4 w-4" />
                Manage career goals
              </Link>
            </Button>
          </div>
        </section>
      ) : null}

      {/* Evolution */}
      <section>
        <h3 className="text-lg font-semibold mb-4">Compatibility evolution</h3>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Overall progression
              </CardTitle>
            </CardHeader>
            <CardContent className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hub.evolution}>
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="overall" stroke="hsl(var(--brand))" strokeWidth={2} dot />
                  <Line type="monotone" dataKey="employability" stroke="#8b5cf6" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-sm">Skill & employability growth</CardTitle>
            </CardHeader>
            <CardContent className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hub.monthlyEvolution}>
                  <defs>
                    <linearGradient id="compatGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--brand))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--brand))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--brand))" fill="url(#compatGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Work style + peers */}
      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-sm">Work style profile</CardTitle>
            <p className="text-xs text-muted-foreground font-normal">
              Inferred from your activity{!hub.quizCompleted ? ' — complete the micro-quiz to refine' : ''}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {hub.workStyle.map((t) => (
              <div key={t.id}>
                <div className="flex justify-between text-xs mb-1">
                  <span>{t.label}</span>
                  <span>{t.score}%</span>
                </div>
                <Progress value={t.score} className="h-1.5" />
              </div>
            ))}

            {!hub.quizCompleted ? (
              <div className="mt-6 space-y-4 pt-4 border-t border-border/60">
                <p className="text-sm font-medium">Micro-quiz (3 questions)</p>
                {hub.quizQuestions.map((q) => (
                  <div key={q.id}>
                    <p className="text-sm mb-2">{q.question}</p>
                    <div className="flex flex-wrap gap-2">
                      {q.options.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => setQuizAnswers((prev) => ({ ...prev, [q.id]: o.id }))}
                          className={cn(
                            'rounded-full px-3 py-1.5 text-xs border transition-colors',
                            quizAnswers[q.id] === o.id
                              ? 'border-brand bg-brand/10 text-brand'
                              : 'border-border hover:bg-muted/50'
                          )}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <Button
                  size="sm"
                  disabled={!quizComplete || quizSaving}
                  onClick={() => void submitQuiz()}
                >
                  {quizSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refine my profile'}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Students like you
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">{hub.peersInsight}</p>
            {hub.goals.length > 0 ? (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Your goals</p>
                {hub.goals.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm"
                  >
                    <span>
                      {g.roleTitle}
                      {g.isPrimary ? (
                        <Badge variant="secondary" className="ml-2 text-[10px]">
                          Primary
                        </Badge>
                      ) : null}
                    </span>
                    <span className="font-medium">{g.compatibility}%</span>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      {/* Opportunities */}
      {hub.opportunities.length > 0 ? (
        <section>
          <h3 className="text-lg font-semibold mb-4">Matched opportunities</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {hub.opportunities.map((o) => (
              <Link key={o.id} href={o.href}>
                <Card className="hover:shadow-md transition-shadow border-border/60 h-full">
                  <CardContent className="py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{o.title}</p>
                      <p className="text-sm text-muted-foreground">{o.subtitle}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-semibold text-brand">{o.compatibility}%</p>
                      <p className="text-[10px] text-muted-foreground">fit</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Footer CTA */}
      <section className="rounded-xl border border-border/60 bg-muted/20 px-6 py-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-brand shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground max-w-xl">
            Every grade, attendance update, startup milestone, and profile change recalculates your compatibility
            automatically. Keep building inside UniBridge — your future score is always evolving.
          </p>
        </div>
        <Button asChild>
          <Link href="/student/career/paths">Explore career paths</Link>
        </Button>
      </section>
    </div>
  );
}
