'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  Calendar,
  ChevronRight,
  Loader2,
  MessageSquare,
  Radio,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { CareerMentorHub } from '@/lib/student/student-career-mentor';
import type { MentorInsightType } from '@/lib/career/mentor-intelligence';
import { ProgressRing } from '@/components/student/home/progress-ring';

const INSIGHT_ICONS: Record<MentorInsightType, string> = {
  progress: 'text-blue-600',
  compatibility: 'text-brand',
  priority: 'text-violet-600',
  weakness: 'text-amber-600',
  motivation: 'text-emerald-600',
  alert: 'text-red-600',
};

const CATEGORY_LABELS: Record<string, string> = {
  internship: 'Internship',
  networking: 'Networking',
  certification: 'Certification',
  project: 'Project',
  startup: 'Startup',
  event: 'Event',
  skill: 'Skill',
};

function TrendBadge({ trend }: { trend: 'rising' | 'stable' | 'declining' }) {
  if (trend === 'rising') {
    return (
      <Badge variant="secondary" className="text-emerald-700 gap-1">
        <TrendingUp className="h-3 w-3" /> Rising
      </Badge>
    );
  }
  if (trend === 'declining') {
    return (
      <Badge variant="secondary" className="text-amber-700 gap-1">
        <TrendingDown className="h-3 w-3" /> Needs attention
      </Badge>
    );
  }
  return <Badge variant="secondary">Stable</Badge>;
}

export function MentorCommandCenter({ initialHub }: { initialHub: CareerMentorHub }) {
  const [hub, setHub] = useState(initialHub);
  const [live, setLive] = useState(true);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'mentor'; text: string }[]>([]);

  const fetchHub = useCallback(async () => {
    const res = await fetch('/api/student/career/mentor');
    if (res.ok) setHub(await res.json());
  }, []);

  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => void fetchHub(), 50_000);
    return () => clearInterval(t);
  }, [live, fetchHub]);

  async function askMentor(prompt: string) {
    const text = prompt.trim();
    if (!text) return;
    setAiLoading(true);
    setAiPrompt('');
    setChatHistory((h) => [...h, { role: 'user', text }]);
    const res = await fetch('/api/student/career/mentor/advise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: text }),
    });
    if (res.ok) {
      const data = await res.json();
      setAiReply(data.reply);
      setChatHistory((h) => [...h, { role: 'mentor', text: data.reply }]);
    }
    setAiLoading(false);
  }

  return (
    <div className="space-y-10 pb-12">
      {/* Hero + Dashboard */}
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-background via-background to-violet-500/5 p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex-1 min-w-[260px]">
            <div className="flex items-center gap-2 text-sm text-brand font-medium">
              <Radio className={cn('h-4 w-4', live && 'animate-pulse')} />
              Live mentor intelligence
              <button
                type="button"
                className="text-xs text-muted-foreground underline ml-2"
                onClick={() => setLive((v) => !v)}
              >
                {live ? 'Pause' : 'Resume'}
              </button>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Your strategic guide to the future you want
            </h2>
            <p className="mt-2 text-muted-foreground text-sm max-w-xl">
              Analyzing goals, compatibility, grades, startup activity, and behavior to optimize every step.
            </p>
            {hub.liveUpdates.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {hub.liveUpdates.map((d) => (
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
          <div className="flex gap-5">
            <ProgressRing value={hub.dashboard.overallScore} label="Overall" size={96} stroke={8} />
            <ProgressRing value={hub.dashboard.employabilityScore} label="Employability" size={96} stroke={8} />
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border/60 bg-card/80 p-4">
            <p className="text-xs text-muted-foreground">Strongest area</p>
            <p className="mt-1 text-sm font-medium">{hub.dashboard.strongestArea}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/80 p-4">
            <p className="text-xs text-muted-foreground">Biggest weakness</p>
            <p className="mt-1 text-sm font-medium">{hub.dashboard.biggestWeakness}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/80 p-4">
            <p className="text-xs text-muted-foreground">Growth trend</p>
            <div className="mt-1">
              <TrendBadge trend={hub.dashboard.growthTrend} />
            </div>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/80 p-4">
            <p className="text-xs text-muted-foreground">Recommended focus</p>
            <p className="mt-1 text-sm font-medium">{hub.dashboard.recommendedFocus}</p>
          </div>
        </div>
      </section>

      {!hub.hasCompanyData ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-5 py-4 text-sm text-muted-foreground">
          Strategic recommendations refine as companies publish internships and roles. Profile-based mentoring is
          active now.
        </div>
      ) : null}

      {/* Best next step + Daily guidance */}
      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1 border-brand/25 bg-brand/5">
          <CardContent className="py-6">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-brand shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Best next step</p>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{hub.bestNextStep}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand" />
              Personalized daily guidance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {hub.dailyGuidance.map((insight) => (
              <div
                key={insight.id}
                className={cn(
                  'rounded-lg border border-border/50 px-4 py-3 text-sm flex items-start justify-between gap-3',
                  insight.href && 'hover:bg-muted/30 transition-colors'
                )}
              >
                {insight.href ? (
                  <Link href={insight.href} className="flex-1">
                    <span className={cn('font-medium', INSIGHT_ICONS[insight.type])}>
                      {insight.text}
                    </span>
                  </Link>
                ) : (
                  <span className="flex-1">{insight.text}</span>
                )}
                {insight.href ? <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" /> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Strategy recommendations */}
      <section>
        <h3 className="text-lg font-semibold mb-4">Career strategy recommendations</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {hub.strategyRecommendations.map((rec) => (
            <Link key={rec.id} href={rec.href}>
              <Card className="h-full border-border/60 hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <Badge variant="outline" className="text-[10px] mb-2">
                    {CATEGORY_LABELS[rec.category] ?? rec.category}
                  </Badge>
                  <p className="font-medium">{rec.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{rec.description}</p>
                  <p className="text-xs text-brand mt-2 font-medium">{rec.impact}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Weaknesses + Motivation */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Weakness detection
          </h3>
          <div className="space-y-3">
            {hub.weaknesses.length === 0 ? (
              <Card className="border-border/60">
                <CardContent className="py-6 text-sm text-muted-foreground">
                  No critical gaps detected — keep executing your strategy.
                </CardContent>
              </Card>
            ) : (
              hub.weaknesses.map((w) => (
                <Link key={w.id} href={w.href}>
                  <Card className="border-border/60 hover:bg-muted/20 transition-colors">
                    <CardContent className="py-4 flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{w.area}</p>
                          <Badge
                            variant="secondary"
                            className={cn(
                              'text-[10px]',
                              w.severity === 'high' && 'text-amber-700',
                              w.severity === 'medium' && 'text-muted-foreground'
                            )}
                          >
                            {w.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{w.message}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Motivation & progress</h3>
          <div className="space-y-3">
            {hub.motivations.map((m) => (
              <Card key={m.id} className="border-emerald-500/20 bg-emerald-500/5">
                <CardContent className="py-4 text-sm">{m.text}</CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Forecasts + Timeline */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-lg font-semibold mb-4">Career scenario forecasting</h3>
          <div className="space-y-3">
            {hub.forecasts.map((f) => (
              <Card key={f.id} className="border-border/60">
                <CardContent className="py-4">
                  <p className="text-sm font-medium">{f.scenario}</p>
                  <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1 flex-wrap">
                    {f.projectedOutcome}
                    {f.impactPercent ? (
                      <span className="text-emerald-600 text-xs font-medium">(+{f.impactPercent}%)</span>
                    ) : null}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            AI timeline planning
          </h3>
          <div className="space-y-4">
            {hub.timeline.map((block) => (
              <Card key={block.id} className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{block.period}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {block.items.map((item, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex items-center gap-2 text-sm rounded-lg px-3 py-2',
                        item.done ? 'bg-emerald-500/10 text-emerald-800' : 'bg-muted/30'
                      )}
                    >
                      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', item.done ? 'bg-emerald-500' : 'bg-brand')} />
                      {item.href ? (
                        <Link href={item.href} className="hover:underline flex-1">
                          {item.text}
                        </Link>
                      ) : (
                        <span>{item.text}</span>
                      )}
                      {item.done ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Done
                        </Badge>
                      ) : null}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Employability trend */}
      <section>
        <h3 className="text-lg font-semibold mb-4">Employability trend</h3>
        <Card className="border-border/60">
          <CardContent className="h-52 pt-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hub.dashboard.employabilityTrend}>
                <defs>
                  <linearGradient id="empMentorGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#8b5cf6" fill="url(#empMentorGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      {/* AI Conversations */}
      <section>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          AI career conversations
        </h3>
        <Card className="border-border/60">
          <CardContent className="space-y-4 py-6">
            <p className="text-xs text-muted-foreground">
              Structured, profile-aware guidance — not a generic chatbot. Every answer uses your goals, compatibility,
              and activity.
            </p>
            <div className="flex flex-wrap gap-2">
              {hub.conversationStarters.map((s) => (
                <Button key={s} variant="outline" size="sm" onClick={() => askMentor(s)} disabled={aiLoading}>
                  {s}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Ask your career mentor…"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && aiPrompt.trim() && askMentor(aiPrompt)}
              />
              <Button onClick={() => aiPrompt.trim() && askMentor(aiPrompt)} disabled={aiLoading}>
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ask'}
              </Button>
            </div>
            {chatHistory.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto rounded-lg border border-border/60 p-4 bg-muted/20">
                {chatHistory.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      'rounded-lg px-4 py-3 text-sm max-w-[90%]',
                      msg.role === 'user'
                        ? 'ml-auto bg-brand/10 text-foreground'
                        : 'bg-card border border-border/60'
                    )}
                  >
                    {msg.role === 'mentor' ? (
                      <Brain className="h-3.5 w-3.5 text-brand inline mr-2 mb-0.5" />
                    ) : null}
                    {msg.text}
                  </div>
                ))}
              </div>
            ) : aiReply ? (
              <p className="rounded-lg bg-muted/50 px-4 py-3 text-sm leading-relaxed">{aiReply}</p>
            ) : null}
          </CardContent>
        </Card>
      </section>

      {/* Behavioral + Goals */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-lg font-semibold mb-4">Behavioral intelligence</h3>
          <Card className="border-border/60">
            <CardContent className="space-y-4 py-6">
              {hub.behavioralProfile.map((t) => (
                <div key={t.trait}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{t.trait}</span>
                    <span>{t.score}%</span>
                  </div>
                  <Progress value={t.score} className="h-1.5 mb-1" />
                  <p className="text-[11px] text-muted-foreground">{t.insight}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5" />
            Goal-based mentoring
          </h3>
          <Card className="border-border/60">
            <CardContent className="py-6 space-y-3">
              {hub.goals.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Define dream careers and companies on{' '}
                  <Link href="/student/career/paths" className="text-brand underline">
                    Career Paths
                  </Link>{' '}
                  — your mentor adapts all guidance around them.
                </p>
              ) : (
                hub.goals.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-3 text-sm"
                  >
                    <div>
                      <span className="font-medium">{g.roleTitle}</span>
                      {g.companyName ? (
                        <span className="text-muted-foreground"> · {g.companyName}</span>
                      ) : null}
                      {g.isPrimary ? (
                        <Badge variant="secondary" className="ml-2 text-[10px]">
                          Primary
                        </Badge>
                      ) : null}
                    </div>
                    <span className="font-semibold tabular-nums">{g.compatibility}%</span>
                  </div>
                ))
              )}
              <Button variant="outline" className="w-full mt-2" asChild>
                <Link href="/student/career/paths">
                  Manage goals
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Opportunity feed */}
      {hub.opportunityFeed.length > 0 ? (
        <section>
          <h3 className="text-lg font-semibold mb-4">Personalized opportunity feed</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {hub.opportunityFeed.map((o) => (
              <Link key={o.id} href={o.href}>
                <Card className="hover:shadow-md transition-shadow border-border/60 h-full">
                  <CardContent className="py-4 flex items-center justify-between gap-4">
                    <div>
                      <Badge variant="outline" className="text-[10px] mb-2">
                        {o.type}
                      </Badge>
                      <p className="font-medium">{o.title}</p>
                      {o.subtitle ? (
                        <p className="text-sm text-muted-foreground">{o.subtitle}</p>
                      ) : null}
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

      {/* Footer */}
      <section className="rounded-xl border border-border/60 bg-muted/20 px-6 py-5 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground max-w-xl">
          Your mentor evolves with every grade, attendance update, startup milestone, and profile change. Actions
          inside UniBridge directly shape tomorrow&apos;s guidance.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/student/career/compatibility">Compatibility Engine</Link>
          </Button>
          <Button asChild>
            <Link href="/student/career/paths">Career Paths</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
