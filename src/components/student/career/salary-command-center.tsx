'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Globe,
  Loader2,
  MapPin,
  MessageSquare,
  Rocket,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { SalaryHub } from '@/lib/student/student-salary-hub';
import { financialGoalProgress } from '@/lib/career/salary-simulation';
import { ProgressRing } from '@/components/student/home/progress-ring';

export function SalaryCommandCenter({ initialHub }: { initialHub: SalaryHub }) {
  const [hub, setHub] = useState(initialHub);
  const [careerId, setCareerId] = useState(initialHub.activeSimulation.careerId);
  const [locationId, setLocationId] = useState(initialHub.activeSimulation.location.id);
  const [modifiers, setModifiers] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>(initialHub.compareCareers.map((c) => c.careerId).slice(0, 3));
  const [successId, setSuccessId] = useState(initialHub.portugueseSection[0]?.id ?? 'pt-farfetch');
  const [loading, setLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [showStartup, setShowStartup] = useState(false);

  const fetchHub = useCallback(async () => {
    const params = new URLSearchParams({
      careerId,
      locationId,
      successId,
    });
    if (modifiers.length) params.set('modifiers', modifiers.join(','));
    if (compareIds.length) params.set('compare', compareIds.join(','));
    const res = await fetch(`/api/student/career/salary?${params}`);
    if (res.ok) setHub(await res.json());
  }, [careerId, locationId, modifiers, compareIds, successId]);

  useEffect(() => {
    const t = setTimeout(() => void fetchHub(), 300);
    return () => clearTimeout(t);
  }, [fetchHub]);

  const sim = hub.activeSimulation;
  const chartData = sim.stages.map((s) => ({
    label: s.label,
    gross: s.grossAnnual,
    net: s.netMonthly,
  }));

  const wealthTimeData = hub.compareCareers.length >= 2
    ? hub.compareCareers.map((c) => ({
        name: c.roleTitle.slice(0, 14),
        salary: c.netMonthlyFiveYear,
        stress: c.curve.stress,
        freeTime: c.curve.freeTime,
        flexibility: c.curve.flexibility,
      }))
    : [
        {
          name: sim.roleTitle.slice(0, 14),
          salary: sim.netMonthlyFiveYear,
          stress: sim.curve.stress,
          freeTime: sim.curve.freeTime,
          flexibility: sim.curve.flexibility,
        },
      ];

  const atAge = useMemo(
    () => hub.atAgeComparisons.find((c) => c.profile.id === successId) ?? hub.atAgeComparisons[0],
    [hub.atAgeComparisons, successId]
  );

  async function askAdvisor() {
    if (!aiPrompt.trim()) return;
    setLoading(true);
    const res = await fetch('/api/student/career/salary/advise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: aiPrompt, careerId, locationId, modifierIds: modifiers }),
    });
    if (res.ok) {
      const data = await res.json();
      setAiReply(data.reply);
    }
    setLoading(false);
  }

  function toggleModifier(id: string) {
    setModifiers((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return [...prev.slice(1), id];
      return [...prev, id];
    });
  }

  return (
    <div className="space-y-10 pb-12">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950/40 p-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-500/20 via-transparent to-transparent" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-violet-300 font-medium">
              <Sparkles className="h-4 w-4" />
              Future life simulation
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">What kind of life could this path give you?</h2>
            <p className="mt-2 text-sm text-slate-300 max-w-xl">
              Salary, taxes, lifestyle, and progression — connected to your Compatibility Engine and Career Paths.
            </p>
          </div>
          <div className="flex gap-4">
            <ProgressRing value={sim.compatibility} label="Path fit" size={96} stroke={8} />
          </div>
        </div>

        <div className="relative mt-8 flex flex-wrap gap-3">
          <select
            className="rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white min-w-[180px]"
            value={careerId}
            onChange={(e) => setCareerId(e.target.value)}
          >
            {hub.careers.map((c) => (
              <option key={c.id} value={c.id} className="text-foreground">
                {c.roleTitle}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white min-w-[160px]"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
          >
            {hub.locations.map((l) => (
              <option key={l.id} value={l.id} className="text-foreground">
                {l.city}, {l.country}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Live headline */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60 bg-card/80 backdrop-blur">
          <CardContent className="py-5">
            <p className="text-xs text-muted-foreground">Net monthly (now)</p>
            <p className="text-2xl font-semibold mt-1">
              {sim.location.symbol}
              {sim.netMonthlyNow.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">After ~{Math.round(sim.location.taxRate * 100)}% tax est.</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="py-5">
            <p className="text-xs text-muted-foreground">5-year net / month</p>
            <p className="text-2xl font-semibold text-brand mt-1">
              {sim.location.symbol}
              {sim.netMonthlyFiveYear.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="py-5">
            <p className="text-xs text-muted-foreground">10-year gross</p>
            <p className="text-2xl font-semibold mt-1">
              {sim.location.symbol}
              {sim.tenYearGross.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="py-5">
            <p className="text-xs text-muted-foreground">Lifestyle tier (5y)</p>
            <p className="text-lg font-semibold capitalize mt-1">{sim.lifestyleFiveYear.tier}</p>
            <p className="text-[10px] text-muted-foreground">{sim.lifestyleFiveYear.monthlySavings}/mo savings est.</p>
          </CardContent>
        </Card>
      </section>

      {/* Growth timeline */}
      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Salary growth timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="salaryGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--brand))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--brand))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="gross" stroke="hsl(var(--brand))" fill="url(#salaryGrad)" name="Gross annual" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-sm">Career progression stages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {['Junior', 'Mid-level', 'Senior', 'Director'].map((label, i) => {
              const stage = sim.stages[Math.min(i + 1, sim.stages.length - 1)];
              return (
                <div key={label} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-brand/10 flex items-center justify-center text-xs font-medium text-brand">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">
                      Net ~{sim.location.symbol}
                      {stage?.netMonthly.toLocaleString()}/mo
                    </p>
                  </div>
                </div>
              );
            })}
            <div className="flex flex-wrap gap-1 pt-2">
              {sim.curve.tags.map((t) => (
                <Badge key={t} variant="outline" className="text-[10px]">
                  {t}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Lifestyle */}
      <section>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Lifestyle simulation — {sim.location.city}
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-violet-500/20 bg-violet-500/5">
            <CardHeader>
              <CardTitle className="text-sm">Today</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>{sim.lifestyle.apartment}</p>
              <p>{sim.lifestyle.travel}</p>
              <p>{sim.lifestyle.car}</p>
              <p className="text-muted-foreground">{sim.lifestyle.workLifeBalance}</p>
            </CardContent>
          </Card>
          <Card className="border-brand/20 bg-brand/5">
            <CardHeader>
              <CardTitle className="text-sm">After 5 years (projected)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>{sim.lifestyleFiveYear.summary}</p>
              <p className="font-medium text-brand">
                ~{sim.location.symbol}
                {sim.lifestyleFiveYear.monthlySavings.toLocaleString()} monthly savings potential
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* What-if */}
      <section>
        <h3 className="text-lg font-semibold mb-3">What if?</h3>
        <div className="flex flex-wrap gap-2">
          {hub.whatIfModifiers.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => toggleModifier(m.id)}
              className={cn(
                'rounded-full px-4 py-2 text-xs font-medium border transition-all',
                modifiers.includes(m.id)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border/60 hover:bg-muted/50'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">Projections update live when you toggle scenarios.</p>
      </section>

      {/* City comparison */}
      <section>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Country & city comparison
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {hub.locationComparison.map((row) => (
            <button
              key={row.location.id}
              type="button"
              onClick={() => setLocationId(row.location.id)}
              className={cn(
                'rounded-xl border p-4 text-left transition-all hover:shadow-md',
                locationId === row.location.id ? 'ring-2 ring-brand border-brand/40' : 'border-border/60'
              )}
            >
              <p className="font-medium">{row.location.city}</p>
              <p className="text-xs text-muted-foreground">{row.location.country}</p>
              <p className="text-lg font-semibold mt-2 text-brand">
                {row.location.symbol}
                {row.netMonthlyFiveYear.toLocaleString()}/mo
              </p>
              <Badge variant="secondary" className="text-[10px] mt-2 capitalize">
                {row.tier} lifestyle
              </Badge>
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-3">{sim.purchasingPowerNote}</p>
      </section>

      {/* Wealth vs time */}
      <section>
        <h3 className="text-lg font-semibold mb-4">Wealth vs time & balance</h3>
        <Card className="border-border/60">
          <CardContent className="h-64 pt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wealthTimeData} layout="vertical" margin={{ left: 80 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={75} />
                <Tooltip />
                <Bar dataKey="salary" fill="hsl(var(--brand))" name="Salary index" radius={4} />
                <Bar dataKey="freeTime" fill="#8b5cf6" name="Free time" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      {/* Compare careers */}
      <section>
        <h3 className="text-lg font-semibold mb-3">Compare career paths</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {hub.careers.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => toggleCompare(c.id)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs border',
                compareIds.includes(c.id) ? 'bg-violet-100 border-violet-300 text-violet-900' : 'border-border'
              )}
            >
              {c.roleTitle}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b">
                <th className="p-3 text-left">Path</th>
                <th className="p-3 text-left">5y net/mo</th>
                <th className="p-3 text-left">Stress</th>
                <th className="p-3 text-left">Flexibility</th>
                <th className="p-3 text-left">Fit</th>
              </tr>
            </thead>
            <tbody>
              {hub.compareCareers.map((c) => (
                <tr key={c.careerId} className="border-b border-border/40">
                  <td className="p-3 font-medium">{c.roleTitle}</td>
                  <td className="p-3">
                    {c.location.symbol}
                    {c.netMonthlyFiveYear.toLocaleString()}
                  </td>
                  <td className="p-3">{c.curve.stress}%</td>
                  <td className="p-3">{c.curve.flexibility}%</td>
                  <td className="p-3 text-brand">{c.compatibility}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Startup founder */}
      <section>
        <Button variant="outline" onClick={() => setShowStartup((v) => !v)} className="mb-4">
          <Rocket className="mr-2 h-4 w-4" />
          {showStartup ? 'Hide' : 'Show'} startup founder simulation
        </Button>
        {showStartup ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-sm">Salary & equity progression</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {hub.startupSimulation.stages.map((s) => (
                  <div key={s.label} className="flex justify-between text-sm border-b border-border/40 pb-2">
                    <span>{s.label}</span>
                    <span>
                      {sim.location.symbol}
                      {s.salary.toLocaleString()} · {s.equity}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-sm">Funding & exit scenarios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {hub.startupSimulation.fundingRounds.map((f) => (
                  <p key={f.round} className="text-sm">
                    <strong>{f.round}:</strong> {f.dilution} dilution · {f.valuation}
                  </p>
                ))}
                {hub.startupSimulation.exitScenarios.map((e) => (
                  <p key={e.label} className="text-xs text-muted-foreground">
                    {e.label}: {e.outcome}
                  </p>
                ))}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </section>

      {/* Financial goals */}
      <section>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Financial goals
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {hub.financialGoals.map((g) => {
            const prog = financialGoalProgress(sim.lifestyleFiveYear.monthlySavings, g.id);
            return (
              <Card key={g.id} className="border-border/60">
                <CardContent className="py-4">
                  <p className="font-medium text-sm">{g.label}</p>
                  <p className={cn('text-xs mt-1', prog.feasible ? 'text-emerald-600' : 'text-amber-600')}>
                    {prog.message}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* AI advisor */}
      <section>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          AI financial advisor
        </h3>
        <Card className="border-border/60">
          <CardContent className="space-y-4 py-6">
            <ul className="space-y-2">
              {hub.aiInsights.map((line, i) => (
                <li key={i} className="text-sm rounded-lg bg-muted/40 px-3 py-2">
                  {line}
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Input
                placeholder="Ask about cities, startup vs consulting, balance…"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && askAdvisor()}
              />
              <Button onClick={() => void askAdvisor()} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ask'}
              </Button>
            </div>
            {aiReply ? <p className="text-sm text-muted-foreground">{aiReply}</p> : null}
          </CardContent>
        </Card>
      </section>

      {/* At your age */}
      <section className="rounded-2xl border border-border/60 bg-gradient-to-b from-muted/20 to-background p-6">
        <h3 className="text-xl font-semibold mb-2">At your age</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
          Compare your trajectory with documented milestones from successful profiles — aspirational, realistic,
          never generic motivation. Sources: public biographies and verified career histories.
        </p>

        <div className="flex flex-wrap gap-2 mb-6">
          {hub.successProfiles.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSuccessId(p.id)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs border',
                successId === p.id ? 'bg-primary text-primary-foreground' : 'border-border'
              )}
            >
              {p.name}
            </button>
          ))}
        </div>

        {atAge ? (
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-sm">You at {atAge.studentAge}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {atAge.studentSnapshot.map((s) => (
                  <div key={s.label} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="font-medium">{s.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-brand/30 bg-brand/5">
              <CardHeader>
                <CardTitle className="text-sm">
                  {atAge.profile.name} at {atAge.targetAge}
                </CardTitle>
                <p className="text-[10px] text-muted-foreground font-normal">{atAge.profile.sourceNote}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {atAge.roleModelSnapshot.map((s) => (
                  <div key={s.label} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="font-medium text-right max-w-[55%]">{s.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-sm">How similar are you?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-semibold text-brand">{atAge.similarityScore}%</p>
                <Progress value={atAge.similarityScore} className="h-2 mt-3" />
                <p className="text-xs font-medium mt-4 mb-2">What you still need</p>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  {atAge.stillNeed.map((n) => (
                    <li key={n}>· {n}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {atAge ? (
          <>
            <h4 className="text-sm font-semibold mt-8 mb-3">Before success — the reality</h4>
            <div className="flex flex-wrap gap-2 mb-6">
              {atAge.profile.beforeSuccess.map((b) => (
                <Badge key={b} variant="outline" className="text-xs font-normal">
                  {b}
                </Badge>
              ))}
            </div>
            <h4 className="text-sm font-semibold mb-2">What they did differently</h4>
            <ul className="text-sm text-muted-foreground space-y-1 mb-6">
              {atAge.profile.whatTheyDidDifferently.map((w) => (
                <li key={w}>· {w}</li>
              ))}
            </ul>
            <h4 className="text-sm font-semibold mb-3">Success timeline</h4>
            <div className="relative border-l border-border ml-3 space-y-4 pl-6">
              {atAge.timeline.map((t) => (
                <div key={t.age}>
                  <span className="absolute -left-[1.35rem] top-1 h-2 w-2 rounded-full bg-violet-500" />
                  <p className="text-xs text-muted-foreground">Age {t.age}</p>
                  <p className="text-sm font-medium">{t.roleModel}</p>
                  {t.student ? <p className="text-xs text-brand">{t.student}</p> : null}
                </div>
              ))}
            </div>
          </>
        ) : null}

        <h4 className="text-sm font-semibold mt-8 mb-3 flex items-center gap-2">Portuguese success stories</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          {hub.portugueseSection.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSuccessId(p.id)}
              className="rounded-xl border border-border/60 p-4 text-left hover:bg-muted/30 transition-colors"
            >
              <p className="font-medium">{p.name}</p>
              <p className="text-xs text-muted-foreground">{p.currentRole}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <Link href="/student/career/compatibility">Compatibility Engine</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/student/career/paths">Career Paths</Link>
        </Button>
        <Button asChild>
          <Link href="/student/career/mentor">
            <Target className="mr-2 h-4 w-4" />
            AI Mentor
          </Link>
        </Button>
      </section>
    </div>
  );
}
