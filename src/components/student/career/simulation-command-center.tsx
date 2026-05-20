'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Clock,
  Globe,
  Heart,
  Loader2,
  MapPin,
  MessageSquare,
  Plane,
  Sparkles,
  Sun,
  Zap,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { CareerSimulationHub } from '@/lib/student/student-career-simulation-hub';
import type { SimulationPathType } from '@/lib/career/career-simulation-intelligence';
import { ProgressRing } from '@/components/student/home/progress-ring';

const MOOD_STYLES = {
  calm: 'border-emerald-500/30 bg-emerald-500/5',
  intense: 'border-rose-500/30 bg-rose-500/5',
  social: 'border-violet-500/30 bg-violet-500/5',
  focus: 'border-sky-500/30 bg-sky-500/5',
  uncertain: 'border-amber-500/30 bg-amber-500/5',
};

export function SimulationCommandCenter({ initialHub }: { initialHub: CareerSimulationHub }) {
  const [hub, setHub] = useState(initialHub);
  const [careerId, setCareerId] = useState(initialHub.activeSimulation.careerId);
  const [locationId, setLocationId] = useState(initialHub.activeSimulation.location.id);
  const [pathType, setPathType] = useState<SimulationPathType>(initialHub.activeSimulation.pathType);
  const [modifiers, setModifiers] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>(
    initialHub.compareSimulations.map((s) => s.careerId).filter((id, i, a) => a.indexOf(id) === i).slice(0, 3)
  );
  const [loading, setLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [timelineAge, setTimelineAge] = useState<number | null>(null);

  const fetchHub = useCallback(async () => {
    const params = new URLSearchParams({ careerId, locationId, pathType });
    if (modifiers.length) params.set('modifiers', modifiers.join(','));
    if (compareIds.length) params.set('compare', compareIds.join(','));
    const res = await fetch(`/api/student/career/simulation?${params}`);
    if (res.ok) setHub(await res.json());
  }, [careerId, locationId, pathType, modifiers, compareIds]);

  useEffect(() => {
    const t = setTimeout(() => void fetchHub(), 280);
    return () => clearTimeout(t);
  }, [fetchHub]);

  const sim = hub.activeSimulation;
  const selectedTimeline = hub.activeSimulation.lifeTimeline.find((n) => n.age === timelineAge) ?? hub.activeSimulation.lifeTimeline[0]!;

  const radarData = hub.scenarioComparison.map((row) => ({
    scenario: row.label.split('·')[0]?.trim() ?? row.label,
    Lifestyle: row.lifestyle,
    Freedom: row.freedom,
    Growth: row.growth,
    Money: row.money,
    Flexibility: row.flexibility,
    Networking: row.networking,
  }));

  const timeWealthCompare = hub.compareSimulations.map((s) => ({
    name: s.roleTitle.slice(0, 12),
    money: s.timeWealth.money,
    time: s.timeWealth.time,
    freedom: s.timeWealth.freedom,
    lifestyle: s.timeWealth.lifestyle,
  }));

  async function askAdvisor() {
    if (!aiPrompt.trim()) return;
    setLoading(true);
    const res = await fetch('/api/student/career/simulation/advise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: aiPrompt, careerId, locationId, pathType, modifierIds: modifiers, compareIds }),
    });
    if (res.ok) {
      const data = await res.json();
      setAiReply(data.reply);
    }
    setLoading(false);
  }

  function applyPreset(presetId: string) {
    const p = hub.presetScenarios.find((x) => x.id === presetId);
    if (!p) return;
    setCareerId(p.careerId);
    setLocationId(p.locationId);
    setPathType(p.pathType);
  }

  function toggleModifier(id: string) {
    setModifiers((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return [...prev.slice(1), id];
      return [...prev, id];
    });
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Cinematic hero */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-indigo-950/80 to-slate-900 p-8 text-white shadow-2xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-500/20 via-transparent to-transparent" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <Badge className="border-violet-400/40 bg-violet-500/20 text-violet-100">Future-life simulator</Badge>
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{sim.headline}</h2>
            <p className="text-lg text-white/70">
              An intelligent simulation of lifestyle, growth, balance, and long-term trajectory — personalized to your profile.
            </p>
            <div className="flex flex-wrap gap-2">
              {hub.presetScenarios.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  className="rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-sm transition hover:bg-white/15"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-center gap-3">
            <ProgressRing value={sim.probability.score} size={120} stroke={8} label={`${sim.probability.score}%`} />
            <p className="max-w-[200px] text-center text-sm text-white/80">{sim.probability.label}</p>
          </div>
        </div>
      </section>

      {/* Controls */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Career</p>
          <select
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            value={careerId}
            onChange={(e) => setCareerId(e.target.value)}
          >
            {hub.careers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.roleTitle} {c.isPrimary ? '★' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="mb-2 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <MapPin className="h-3 w-3" /> Location
          </p>
          <select
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
          >
            {hub.locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.city}, {l.country}
              </option>
            ))}
          </select>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Path type</p>
          <div className="flex flex-wrap gap-2">
            {hub.pathTypes.map((pt) => (
              <button
                key={pt.id}
                type="button"
                onClick={() => setPathType(pt.id)}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-xs transition',
                  pathType === pt.id ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'
                )}
              >
                {pt.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Personality + AI insights */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5 lg:col-span-1">
          <p className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-violet-500" /> AI probability engine
          </p>
          <p className="text-2xl font-semibold">{sim.probability.score}% realistic</p>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            {sim.probability.factors.map((f) => (
              <li key={f}>· {f}</li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-1">
            {hub.personalityTraits.map((t) => (
              <Badge key={t} variant="secondary" className="capitalize">
                {t}
              </Badge>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-5 lg:col-span-2">
          <p className="mb-3 text-sm font-medium">Strategic guidance</p>
          <div className="space-y-2">
            {sim.strategicInsights.map((line) => (
              <p key={line} className="rounded-lg bg-muted/50 px-4 py-3 text-sm">
                {line}
              </p>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Input
              placeholder="What if I move abroad? Join a startup?"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void askAdvisor()}
            />
            <Button size="icon" variant="outline" onClick={() => void askAdvisor()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
            </Button>
          </div>
          {aiReply && <p className="mt-2 text-sm text-muted-foreground">{aiReply}</p>}
        </div>
      </section>

      {/* Day in your future life */}
      <section className="rounded-3xl border bg-gradient-to-b from-card to-muted/20 p-6 md:p-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-violet-600">A day in your future life</p>
            <h3 className="text-2xl font-semibold">{sim.headline}</h3>
          </div>
          <Badge variant="outline">{sim.lifestyleFiveYear.tier} lifestyle</Badge>
        </div>
        <div className="relative ml-4 border-l-2 border-dashed border-muted-foreground/30 pl-8">
          {sim.dayInLife.map((block, i) => (
            <div key={block.time} className={cn('relative mb-6 last:mb-0', MOOD_STYLES[block.mood])}>
              <span className="absolute -left-[2.35rem] top-1 flex h-8 w-8 items-center justify-center rounded-full border bg-background text-xs font-mono">
                {i + 1}
              </span>
              <div className="rounded-2xl border p-4">
                <p className="font-mono text-xs text-muted-foreground">{block.time}</p>
                <p className="text-lg font-medium">{block.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{block.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Future timeline */}
      <section className="rounded-3xl border p-6">
        <p className="mb-4 text-xs font-medium uppercase tracking-widest text-muted-foreground">Future timeline</p>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {sim.lifeTimeline.map((node) => (
            <button
              key={node.age}
              type="button"
              onClick={() => setTimelineAge(node.age)}
              className={cn(
                'min-w-[140px] shrink-0 rounded-2xl border px-4 py-3 text-left transition',
                (timelineAge ?? sim.lifeTimeline[0]!.age) === node.age
                  ? 'border-violet-500 bg-violet-500/10 shadow-md'
                  : 'hover:bg-muted/50'
              )}
            >
              <p className="text-2xl font-light text-violet-600">Age {node.age}</p>
              <p className="text-sm font-medium">{node.title}</p>
            </button>
          ))}
        </div>
        <div className="mt-6 rounded-2xl bg-gradient-to-r from-violet-500/10 to-transparent p-6">
          <p className="text-lg font-medium">{selectedTimeline.title}</p>
          <p className="mt-1 text-muted-foreground">{selectedTimeline.description}</p>
          <p className="mt-4 italic text-foreground/80">&ldquo;{selectedTimeline.cinematic}&rdquo;</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {sim.cinematicMilestones.map((m) => (
            <Badge key={m.id} variant="outline" className="gap-1">
              <Zap className="h-3 w-3" /> {m.label} · ~{m.age}
            </Badge>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Lifestyle visualization */}
        <section className="rounded-3xl border p-6">
          <p className="mb-4 flex items-center gap-2 text-sm font-medium">
            <Sun className="h-4 w-4 text-amber-500" /> Future lifestyle
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: MapPin, label: 'Home', value: sim.lifestyleVisual.apartment },
              { icon: Globe, label: 'City life', value: sim.lifestyleVisual.cityLife },
              { icon: Plane, label: 'Travel', value: sim.lifestyleVisual.travel },
              { icon: Clock, label: 'Schedule', value: sim.lifestyleVisual.workSchedule },
              { icon: Heart, label: 'Free time', value: sim.lifestyleVisual.freeTime },
              { icon: Sparkles, label: 'Social', value: sim.lifestyleVisual.socialLife },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-xl border bg-muted/30 p-4">
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Icon className="h-3 w-3" /> {label}
                </p>
                <p className="mt-1 text-sm">{value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Work-life balance */}
        <section className="rounded-3xl border p-6">
          <p className="mb-4 text-sm font-medium">Work-life balance</p>
          <div className="space-y-4">
            {[
              { label: 'Stress load', value: sim.workLife.stress, invert: true },
              { label: 'Flexibility', value: sim.workLife.flexibility },
              { label: 'Free time index', value: sim.workLife.freeTime },
              { label: 'Remote possibility', value: sim.workLife.remotePossibility },
              { label: 'Travel intensity', value: sim.workLife.travelIntensity, invert: true },
            ].map(({ label, value, invert }) => (
              <div key={label}>
                <div className="mb-1 flex justify-between text-xs">
                  <span>{label}</span>
                  <span>{value}%</span>
                </div>
                <Progress value={invert ? 100 - value : value} className="h-2" />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">~{sim.workLife.workHoursPerWeek} hrs/week · Growth speed {sim.growthSpeed}%</p>
          </div>
        </section>
      </div>

      {/* What if */}
      <section className="rounded-3xl border p-6">
        <p className="mb-3 text-sm font-medium">What happens if…</p>
        <div className="flex flex-wrap gap-2">
          {hub.whatIfModifiers.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => toggleModifier(w.id)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs transition',
                modifiers.includes(w.id) ? 'border-violet-500 bg-violet-500/10' : 'hover:bg-muted'
              )}
              title={w.description}
            >
              {w.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Timelines, lifestyle, and balance update live as you toggle variables.</p>
      </section>

      {/* Scenario comparison */}
      <section className="rounded-3xl border p-6">
        <p className="mb-2 text-sm font-medium">Life decision engine — compare paths</p>
        <p className="mb-4 text-xs text-muted-foreground">Select careers to compare startup vs corporate, cities, industries</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {hub.careers.slice(0, 8).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => toggleCompare(c.id)}
              className={cn(
                'rounded-lg border px-2 py-1 text-xs',
                compareIds.includes(c.id) ? 'border-primary bg-primary/10' : ''
              )}
            >
              {c.roleTitle}
            </button>
          ))}
        </div>
        {radarData.length >= 2 && (
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="scenario" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar name="Lifestyle" dataKey="Lifestyle" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                <Radar name="Money" dataKey="Money" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
                <Radar name="Freedom" dataKey="Freedom" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.15} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Time vs wealth */}
      <section className="rounded-3xl border p-6">
        <p className="mb-4 text-sm font-medium">Time, money & freedom</p>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timeWealthCompare} layout="vertical" margin={{ left: 80 }}>
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="money" name="Money" fill="#8b5cf6" stackId="a" />
              <Bar dataKey="time" name="Time" fill="#10b981" stackId="a" />
              <Bar dataKey="freedom" name="Freedom" fill="#0ea5e9" stackId="a" />
              <Bar dataKey="lifestyle" name="Lifestyle" fill="#f59e0b" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          High salary paths often trade time and freedom — compare emotionally, not only financially.
        </p>
      </section>

      {/* Risk analysis */}
      <section className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6">
        <p className="mb-4 flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="h-4 w-4 text-amber-600" /> Career risk analysis
        </p>
        <p className="mb-4 text-sm text-muted-foreground">{sim.risks.summary}</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: 'Job stability', value: sim.risks.jobStability, goodHigh: true },
            { label: 'Burnout risk', value: sim.risks.burnoutRisk, goodHigh: false },
            { label: 'Industry volatility', value: sim.risks.industryVolatility, goodHigh: false },
            { label: 'Automation risk', value: sim.risks.automationRisk, goodHigh: false },
            { label: 'Startup failure', value: sim.risks.startupFailureProb, goodHigh: false },
          ].map((r) => (
            <div key={r.label} className="rounded-xl border bg-background p-3">
              <p className="text-xs text-muted-foreground">{r.label}</p>
              <p className="text-xl font-semibold">{r.value}%</p>
              <Progress value={r.goodHigh ? r.value : 100 - r.value} className="mt-2 h-1.5" />
            </div>
          ))}
        </div>
      </section>

      {/* Ecosystem links */}
      <section className="flex flex-wrap gap-3">
        <Button variant="outline" asChild>
          <Link href="/student/career/paths">Career paths</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/student/career/salary">Salary deep-dive</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/student/career/compatibility">Compatibility</Link>
        </Button>
      </section>
    </div>
  );
}
