'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowRight, ArrowUp, Minus, Sparkles, TrendingUp } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { EmployabilityHub } from '@/lib/student/student-employability-hub';
import type { EmployabilityMilestone, EmployabilityRange } from '@/lib/career/employability-intelligence';

const RANGES: { id: EmployabilityRange; label: string }[] = [
  { id: '1m', label: '1 month' },
  { id: '6m', label: '6 months' },
  { id: '1y', label: '1 year' },
  { id: 'all', label: 'All time' },
];

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <ArrowUp className="h-4 w-4 text-emerald-500" />;
  if (trend === 'down') return <ArrowDown className="h-4 w-4 text-amber-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

export function EmployabilityCommandCenter({ initialHub }: { initialHub: EmployabilityHub }) {
  const [hub, setHub] = useState(initialHub);
  const [range, setRange] = useState<EmployabilityRange>(initialHub.range);
  const [selectedMilestone, setSelectedMilestone] = useState<EmployabilityMilestone | null>(
    initialHub.milestones[initialHub.milestones.length - 1] ?? null
  );

  const fetchHub = useCallback(async () => {
    const res = await fetch(`/api/student/career/employability?range=${range}`);
    if (res.ok) setHub(await res.json());
  }, [range]);

  useEffect(() => {
    const t = setTimeout(() => void fetchHub(), 200);
    return () => clearTimeout(t);
  }, [fetchHub]);

  const chartData = useMemo(() => {
    return hub.evolution.map((p) => ({
      date: p.date,
      label: new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value: p.value,
      projected: p.projected ?? false,
      milestones: p.milestones,
    }));
  }, [hub.evolution]);

  const milestoneDots = useMemo(() => {
    const dots: { x: string; y: number; milestone: EmployabilityMilestone }[] = [];
    for (const p of chartData) {
      for (const m of p.milestones) {
        dots.push({ x: p.label, y: p.value, milestone: m });
      }
    }
    return dots;
  }, [chartData]);

  return (
    <div className="space-y-10 pb-16 max-w-5xl mx-auto">
      {/* Score hero — minimal */}
      <section className="text-center pt-4 pb-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Employability</p>
        <div className="flex items-end justify-center gap-2">
          <span className="text-7xl font-light tabular-nums tracking-tight">{hub.score}</span>
          <span className="text-2xl text-muted-foreground pb-3">/ 100</span>
        </div>
        <div className="flex items-center justify-center gap-3 mt-4 text-sm">
          <TrendIcon trend={hub.trend} />
          {hub.monthDelta != null && (
            <span
              className={cn(
                hub.monthDelta > 0 ? 'text-emerald-600' : hub.monthDelta < 0 ? 'text-amber-600' : 'text-muted-foreground'
              )}
            >
              {hub.monthDelta > 0 ? '+' : ''}
              {hub.monthDelta}% this month
            </span>
          )}
          <span className="text-muted-foreground">· {hub.semesterLabel}</span>
        </div>
      </section>

      {/* Filters */}
      <div className="flex justify-center gap-2">
        {RANGES.map((r) => (
          <Button
            key={r.id}
            size="sm"
            variant={range === r.id ? 'default' : 'ghost'}
            className="rounded-full"
            onClick={() => setRange(r.id)}
          >
            {r.label}
          </Button>
        ))}
      </div>

      {/* Hero graph */}
      <section className="rounded-2xl border border-border/50 bg-gradient-to-b from-background to-muted/20 p-4 sm:p-6 shadow-sm">
        <div className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 16, right: 12, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="empFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--brand))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--brand))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="empProj" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--brand))" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="hsl(var(--brand))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[40, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid hsl(var(--border))',
                  fontSize: 12,
                }}
                formatter={(v: number, _n, props) => [
                  `${v}%${props.payload?.projected ? ' (projected)' : ''}`,
                  'Employability',
                ]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--brand))"
                strokeWidth={2.5}
                fill="url(#empFill)"
                dot={(props) => {
                  const { cx, cy, payload } = props as {
                    cx: number;
                    cy: number;
                    payload: { projected?: boolean; milestones?: EmployabilityMilestone[] };
                  };
                  if (payload?.projected) return <circle cx={cx} cy={cy} r={0} fill="transparent" />;
                  const hasM = (payload?.milestones?.length ?? 0) > 0;
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={hasM ? 5 : 3}
                      fill={hasM ? 'hsl(var(--brand))' : 'hsl(var(--background))'}
                      stroke="hsl(var(--brand))"
                      strokeWidth={2}
                    />
                  );
                }}
                activeDot={{ r: 6 }}
              />
              {milestoneDots.map((d, i) => (
                <ReferenceDot
                  key={`${d.milestone.id}-${i}`}
                  x={d.x}
                  y={d.y}
                  r={6}
                  fill="hsl(var(--brand))"
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                  onClick={() => setSelectedMilestone(d.milestone)}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-3">{hub.projection.message}</p>
      </section>

      {/* Milestone detail */}
      {selectedMilestone && (
        <section className="rounded-xl border border-brand/20 bg-brand/5 px-5 py-4 text-sm animate-in fade-in duration-300">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Milestone</p>
          <p className="font-medium">{selectedMilestone.label}</p>
          <p className="text-muted-foreground mt-1">{selectedMilestone.description}</p>
          <p className="text-emerald-600 text-xs mt-2">+{selectedMilestone.impact}% employability impact</p>
          {selectedMilestone.href && (
            <Link href={selectedMilestone.href} className="text-xs text-brand inline-flex items-center gap-1 mt-2">
              View source <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </section>
      )}

      {/* Drivers — two minimal columns */}
      <section className="grid gap-8 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            What increased your employability
          </h3>
          <ul className="space-y-2">
            {hub.increasedBy.map((d) => (
              <li key={d.id} className="flex justify-between text-sm border-b border-border/40 pb-2">
                {d.href ? (
                  <Link href={d.href} className="hover:text-brand">
                    {d.label}
                  </Link>
                ) : (
                  <span>{d.label}</span>
                )}
                <span className="text-emerald-600 tabular-nums">+{d.impact}%</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-medium mb-3 text-muted-foreground">What is currently limiting you</h3>
          <ul className="space-y-2">
            {hub.limiting.map((d) => (
              <li key={d.id} className="flex justify-between text-sm border-b border-border/40 pb-2">
                {d.href ? (
                  <Link href={d.href} className="hover:text-brand">
                    {d.label}
                  </Link>
                ) : (
                  <span>{d.label}</span>
                )}
                <span className="text-amber-600/90 tabular-nums">{d.impact}%</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Industry — compact */}
      {hub.industries.length > 0 && (
        <section>
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Industry employability</h3>
          <div className="space-y-3 max-w-md">
            {hub.industries.map((ind) => (
              <div key={ind.industry} className="flex items-center gap-3">
                <span className="text-sm w-24 shrink-0 text-muted-foreground">{ind.industry}</span>
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand/80 transition-all duration-500"
                    style={{ width: `${ind.score}%` }}
                  />
                </div>
                <span className="text-sm tabular-nums w-10 text-right">{ind.score}%</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Milestones timeline — subtle */}
      <section>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Key milestones</h3>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {hub.milestones.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedMilestone(m)}
              className={cn(
                'shrink-0 text-left rounded-lg border px-3 py-2 min-w-[140px] transition',
                selectedMilestone?.id === m.id ? 'border-brand bg-brand/5' : 'border-border/60 hover:border-brand/40'
              )}
            >
              <p className="text-[10px] text-muted-foreground">{new Date(m.date).toLocaleDateString()}</p>
              <p className="text-xs font-medium mt-0.5 line-clamp-2">{m.label}</p>
            </button>
          ))}
        </div>
      </section>

      {/* AI + next action + peer — minimal footer */}
      <section className="space-y-6 border-t border-border/60 pt-8">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-brand shrink-0 mt-0.5" />
          <div>
            {hub.insights.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border/60 p-5 bg-muted/20">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Highest impact action</p>
          <p className="text-lg font-medium mt-1">{hub.nextAction.title}</p>
          <p className="text-sm text-muted-foreground mt-1">{hub.nextAction.reason}</p>
          <Link href={hub.nextAction.href}>
            <Button size="sm" className="mt-4 rounded-full">
              Take action
            </Button>
          </Link>
        </div>

        <p className="text-xs text-muted-foreground/80 text-center">{hub.peerBenchmark}</p>

        <div className="flex flex-wrap justify-center gap-3 pt-2">
          {hub.ecosystemLinks.map((l) => (
            <Link key={l.href} href={l.href} className="text-xs text-muted-foreground hover:text-brand">
              {l.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
