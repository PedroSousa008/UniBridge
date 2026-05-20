'use client';

import Link from 'next/link';
import type { CompanyInsightsEcosystemHub } from '@/lib/company/company-insights-ecosystem-hub';
import type { InsightMetricCard } from '@/lib/company/company-insights-intelligence';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Brain,
  Building2,
  ChevronRight,
  GraduationCap,
  Minus,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';

function TrendBadge({ trend, change }: { trend: InsightMetricCard['trend']; change: number | null }) {
  if (change == null) return <Minus className="h-3 w-3 text-muted-foreground" />;
  if (trend === 'up')
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600">
        <ArrowUp className="h-3 w-3" /> {change}%
      </span>
    );
  if (trend === 'down')
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-rose-600">
        <ArrowDown className="h-3 w-3" /> {change}%
      </span>
    );
  return <span className="text-[10px] text-muted-foreground">steady</span>;
}

function MetricTile({ card, dark }: { card: InsightMetricCard; dark?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-3 transition-all duration-500 animate-in fade-in',
        dark ? 'border-white/10 bg-white/5 text-white' : 'bg-card hover:shadow-md hover:border-slate-300/60'
      )}
    >
      <p className={cn('text-[10px] font-medium uppercase tracking-wider', dark ? 'text-white/50' : 'text-muted-foreground')}>
        {card.label}
      </p>
      <p className={cn('mt-1 text-2xl font-bold tabular-nums', dark && 'text-white')}>{card.value}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <TrendBadge trend={card.trend} change={card.changePercent} />
        {card.hint && <span className={cn('text-[10px] truncate', dark ? 'text-white/40' : 'text-muted-foreground')}>{card.hint}</span>}
      </div>
    </div>
  );
}

function SectionTitle({
  title,
  subtitle,
  icon: Icon,
}: {
  title: string;
  subtitle: string;
  icon: typeof BarChart3;
}) {
  return (
    <div className="mb-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <Icon className="h-5 w-5 text-cyan-500" />
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{subtitle}</p>
    </div>
  );
}

export function CompanyInsightsCommandCenter({ hub }: { hub: CompanyInsightsEcosystemHub }) {
  const maxRecruitment = Math.max(1, ...hub.recruitment.stages.map((s) => s.count));
  const maxFunnel = Math.max(1, ...hub.funnel.map((f) => f.count));

  if (!hub.hasPartnerships) {
    return (
      <div className="rounded-2xl border border-dashed p-12 text-center">
        <Brain className="mx-auto h-12 w-12 text-muted-foreground/40" />
        <p className="mt-4 text-lg font-semibold">Activate partnerships to unlock intelligence</p>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
          Insights draws from partner-university talent, applications, pipeline, startups, and events — connect
          universities in Presence first.
        </p>
        <Button className="mt-6" asChild>
          <Link href="/company/presence">Open Presence</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 px-6 py-10 text-white shadow-2xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-500/15 via-transparent to-transparent" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-white/45">Intelligence system</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{hub.heroTitle}</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/65">{hub.heroSubtitle}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {hub.liveSignals.map((sig) => (
              <span
                key={sig}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] text-white/85 animate-pulse"
                style={{ animationDuration: '3s' }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {sig}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* AI cards */}
      <section className="rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-500/5 via-transparent to-cyan-500/5 p-6">
        <p className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-500" />
          AI strategic insights
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {hub.aiCards.map((text) => (
            <div
              key={text}
              className="rounded-xl border bg-card/80 px-4 py-3 text-sm leading-relaxed hover:border-violet-500/30 transition"
            >
              {text}
            </div>
          ))}
        </div>
      </section>

      {/* Recruitment Intelligence */}
      <section>
        <SectionTitle
          title="Recruitment Intelligence Dashboard"
          subtitle="Movement across your hiring ecosystem — not static counts."
          icon={Target}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          {hub.recruitment.momentumCards.map((c) => (
            <MetricTile key={c.id} card={c} />
          ))}
        </div>
        <div className="rounded-2xl border bg-card p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {hub.recruitment.stages.map((stage) => (
              <div key={stage.id} className="relative">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-medium">{stage.label}</span>
                  {stage.momentum === 'rising' && (
                    <Badge className="text-[9px] h-5 bg-emerald-500/15 text-emerald-700 border-0">Live</Badge>
                  )}
                </div>
                <p className="text-2xl font-bold tabular-nums">{stage.count}</p>
                {stage.changeWeek > 0 && (
                  <p className="text-[10px] text-emerald-600 mt-0.5">+{stage.changeWeek} this week</p>
                )}
                <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-slate-800 to-cyan-600 transition-all duration-700"
                    style={{ width: `${(stage.count / maxRecruitment) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Talent quality */}
      <section>
        <SectionTitle
          title="Talent Quality Intelligence"
          subtitle="Where the strongest talent exists across your partner ecosystem."
          icon={Users}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {hub.talentQuality.map((c) => (
            <MetricTile key={c.id} card={c} />
          ))}
        </div>
      </section>

      {/* University performance */}
      <section>
        <SectionTitle
          title="Top Universities by Performance"
          subtitle="Partner universities only — compatibility, startups, leadership, and hiring signals."
          icon={Building2}
        />
        {hub.universityPerformance.length === 0 ? (
          <p className="text-sm text-muted-foreground border border-dashed rounded-xl p-8 text-center">
            No partner university data yet.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {hub.universityPerformance.map((u) => (
              <div
                key={u.universityId}
                className="rounded-2xl border bg-card p-5 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-2xl font-bold text-cyan-600 tabular-nums">#{u.rank}</span>
                    <p className="font-semibold mt-1">{u.name}</p>
                  </div>
                  {u.growthPercent > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                      <TrendingUp className="h-3.5 w-3.5" /> +{u.growthPercent}%
                    </span>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
                  {[
                    ['Compatibility', u.compatibility],
                    ['Startups', u.startupActivity],
                    ['Leadership', `${u.leadership}%`],
                    ['Hiring', u.hiringSuccess],
                    ['Networking', u.networking],
                    ['Employability', u.employability],
                  ].map(([label, val]) => (
                    <div key={label as string} className="rounded-lg bg-muted/40 px-2 py-1.5">
                      <span className="text-muted-foreground">{label}</span>
                      <p className="font-bold tabular-nums">{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Degree intelligence */}
      <section>
        <SectionTitle
          title="Degree Intelligence"
          subtitle="Where future talent is forming — by program and engagement signals."
          icon={GraduationCap}
        />
        <div className="grid gap-6 lg:grid-cols-2">
          {(
            [
              ['Most Compatible Degrees', hub.degreeIntelligence.mostCompatible],
              ['Fastest Growing', hub.degreeIntelligence.fastestGrowing],
              ['Highest Leadership Density', hub.degreeIntelligence.leadership],
              ['Strongest Startup Activity', hub.degreeIntelligence.startup],
            ] as const
          ).map(([title, rows]) => (
            <div key={title} className="rounded-2xl border p-4">
              <p className="text-sm font-semibold mb-3">{title}</p>
              <ul className="space-y-2">
                {rows.length === 0 ? (
                  <li className="text-xs text-muted-foreground">Building signals…</li>
                ) : (
                  rows.map((d, i) => (
                    <li key={d.name} className="flex items-center justify-between text-sm border-b border-border/40 pb-2 last:border-0">
                      <span>
                        <span className="text-muted-foreground mr-2">#{i + 1}</span>
                        {d.name}
                      </span>
                      <span className="font-semibold tabular-nums text-cyan-700">
                        {title.includes('Compatible')
                          ? `${d.avgCompatibility}%`
                          : title.includes('Growing')
                            ? `+${d.growthPercent}%`
                            : title.includes('Leadership')
                              ? `${d.leadershipDensity}%`
                              : `${d.startupDensity}%`}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Attractiveness */}
      <section className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent p-6">
        <SectionTitle
          title="Company Attractiveness Intelligence"
          subtitle="How magnetic your brand is inside the UniBridge ecosystem."
          icon={Zap}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {hub.attractiveness.map((c) => (
            <MetricTile key={c.id} card={c} />
          ))}
        </div>
      </section>

      {/* Funnel */}
      <section>
        <SectionTitle
          title="Talent Funnel Analytics"
          subtitle="Elegant conversion from discovery to hire — with compatibility quality at each stage."
          icon={BarChart3}
        />
        <div className="rounded-2xl border bg-card p-6 space-y-4">
          {hub.funnel.map((stage, i) => (
            <div key={stage.id} className="flex items-center gap-4">
              <div className="w-28 shrink-0 text-sm font-medium">{stage.label}</div>
              <div className="flex-1">
                <div
                  className="h-10 rounded-lg bg-gradient-to-r from-slate-800 via-slate-700 to-cyan-700 flex items-center px-3 transition-all duration-700"
                  style={{ width: `${Math.max(12, (stage.count / maxFunnel) * 100)}%` }}
                >
                  <span className="text-xs font-bold text-white tabular-nums">{stage.count}</span>
                </div>
              </div>
              <div className="w-24 shrink-0 text-right text-[11px] text-muted-foreground">
                {stage.conversionFromPrev != null ? `${stage.conversionFromPrev}% conv.` : '—'}
                {stage.avgCompatibility != null && (
                  <p className="text-cyan-600 font-medium">{stage.avgCompatibility}% fit</p>
                )}
              </div>
            </div>
          ))}
          <p className="text-sm text-muted-foreground pt-2 border-t">{hub.funnelInsight}</p>
        </div>
      </section>

      {/* Engagement */}
      <section>
        <SectionTitle
          title="Student Engagement Intelligence"
          subtitle="Where students are active — events, networking, startups, and career motion."
          icon={TrendingUp}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {hub.engagement.map((c) => (
            <MetricTile key={c.id} card={c} />
          ))}
        </div>
      </section>

      {/* Event impact */}
      <section>
        <SectionTitle
          title="Event Impact Intelligence"
          subtitle="Measure whether events generated applications, pipeline movement, and compatibility lift."
          icon={Target}
        />
        {hub.eventImpact.length === 0 ? (
          <p className="text-sm text-muted-foreground border border-dashed rounded-xl p-8 text-center">
            Publish events to unlock impact intelligence.{' '}
            <Link href="/company/events" className="text-brand underline">
              Go to Events
            </Link>
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {hub.eventImpact.map((ev) => (
              <div key={ev.id} className="rounded-xl border p-4 hover:border-cyan-500/30 transition">
                <p className="font-medium">{ev.title}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-lg bg-muted/40 p-2">
                    <span className="text-muted-foreground">RSVPs</span>
                    <p className="font-bold">{ev.rsvpCount}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2">
                    <span className="text-muted-foreground">Applications</span>
                    <p className="font-bold">{ev.applicationsGenerated}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2">
                    <span className="text-muted-foreground">Pipeline moves</span>
                    <p className="font-bold">{ev.pipelineMovement}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2">
                    <span className="text-muted-foreground">Compat. lift</span>
                    <p className="font-bold">+{ev.compatibilityLift}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Long-term */}
      <section className="rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-slate-950 to-slate-900 p-6 text-white">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Brain className="h-5 w-5 text-cyan-400" />
          Long-Term Strategic Intelligence
        </h2>
        <p className="mt-1 text-sm text-white/55 max-w-2xl">
          Directional indicators — trends and ecosystem movement, not unrealistic predictions.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-5">
          {hub.longTerm.map((item) => (
            <div key={item.label} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-white/45">{item.label}</p>
              <p className="mt-1 text-sm font-medium text-white/90">{item.direction}</p>
              <Badge variant="outline" className="mt-2 text-[9px] border-white/20 text-white/60">
                {item.confidence}
              </Badge>
            </div>
          ))}
        </div>
      </section>

      {/* Cross-links */}
      <section className="flex flex-wrap gap-3">
        {hub.crossLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm hover:border-cyan-500/40 transition"
          >
            {link.label}
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          </Link>
        ))}
      </section>
    </div>
  );
}
