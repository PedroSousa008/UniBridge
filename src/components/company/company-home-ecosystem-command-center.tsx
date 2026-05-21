'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { CompanyHomeEcosystemHub } from '@/lib/company/company-home-ecosystem-hub';
import { relativeTime } from '@/lib/company/company-home-intelligence';
import { PartnershipEcosystemPanel } from '@/components/partnerships/partnership-ecosystem-panel';
import { CompanyHomeHero } from '@/components/company/company-home-hero';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Check,
  Loader2,
  Minus,
  Rocket,
  Sparkles,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';

function TrendBadge({ trend, label }: { trend: 'up' | 'down' | 'flat'; label: string }) {
  const Icon = trend === 'up' ? ArrowUpRight : trend === 'down' ? Minus : Sparkles;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[10px] font-medium',
        trend === 'up' && 'text-emerald-600',
        trend === 'down' && 'text-amber-600',
        trend === 'flat' && 'text-muted-foreground'
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function PriorityDot({ priority }: { priority: 'urgent' | 'high' | 'normal' }) {
  return (
    <span
      className={cn(
        'h-2 w-2 rounded-full shrink-0',
        priority === 'urgent' && 'bg-rose-500 animate-pulse',
        priority === 'high' && 'bg-amber-500',
        priority === 'normal' && 'bg-violet-400'
      )}
    />
  );
}

export function CompanyHomeEcosystemCommandCenter({
  initialHub,
}: {
  initialHub: CompanyHomeEcosystemHub;
}) {
  const [hub, setHub] = useState(initialHub);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch('/api/company/home');
    if (res.ok) setHub(await res.json());
  }, []);

  useEffect(() => {
    const es = new EventSource('/api/partnerships/stream');
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as { type?: string };
        if (
          data.type === 'hub_refresh' ||
          data.type === 'partnership_active' ||
          data.type === 'mutual_match' ||
          data.type === 'interest'
        ) {
          void refresh();
        }
      } catch {
        /* ignore */
      }
    };
    return () => es.close();
  }, [refresh]);

  async function partnershipAction(action: 'accept' | 'reject', universityId: string) {
    setLoading(true);
    await fetch('/api/company/profile/partnerships', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, universityId }),
    });
    await refresh();
    setLoading(false);
  }

  return (
    <div className="space-y-8 pb-16">
      <CompanyHomeHero hero={hub.hero} />

      {/* Performance snapshot */}
      <section className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        {hub.metrics.map((m) => (
          <Link
            key={m.id}
            href={m.href}
            className="group rounded-2xl border bg-card p-4 transition hover:border-violet-500/30 hover:shadow-sm"
          >
            <p className="text-2xl font-bold tabular-nums">{m.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
            <div className="mt-2 flex flex-col gap-0.5">
              <TrendBadge trend={m.trend} label={m.trendLabel} />
              {m.insight ? (
                <span className="text-[10px] text-violet-600 dark:text-violet-400">{m.insight}</span>
              ) : null}
            </div>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Live Action Center */}
        <Card className="lg:col-span-2 border-violet-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5 text-violet-500" />
              Live action center
            </CardTitle>
            <p className="text-sm text-muted-foreground">What needs your attention right now.</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {hub.liveActions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                Ecosystem is calm — explore talent or schedule your next event.
              </p>
            ) : (
              hub.liveActions.map((a) => (
                <Link
                  key={a.id}
                  href={a.href}
                  className="flex items-start gap-3 rounded-xl border px-4 py-3 transition hover:bg-muted/40"
                >
                  <PriorityDot priority={a.priority} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{a.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.subtitle}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {relativeTime(a.at)}
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Quick Create */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Quick create
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {hub.quickCreate.map((q) => (
              <Link
                key={q.id}
                href={q.href}
                className="group rounded-xl border px-3 py-2.5 transition hover:border-violet-500/40 hover:bg-violet-500/5"
              >
                <p className="text-sm font-medium group-hover:text-violet-700 dark:group-hover:text-violet-300">
                  {q.label}
                </p>
                <p className="text-[10px] text-muted-foreground">{q.description}</p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      {hub.pendingApprovals.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Pending approvals</CardTitle>
            <p className="text-sm text-muted-foreground">Unified requests across partnerships, events, and talent.</p>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {hub.pendingApprovals.map((p) => (
              <div key={p.id} className="rounded-xl border p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Badge variant="outline" className="text-[10px] mb-1">
                      {p.typeLabel}
                    </Badge>
                    <p className="font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.sender} · {relativeTime(p.at)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {p.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.canAccept && p.universityId ? (
                    <>
                      <Button
                        size="sm"
                        disabled={loading}
                        onClick={() => void partnershipAction('accept', p.universityId!)}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={loading}
                        onClick={() => void partnershipAction('reject', p.universityId!)}
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Reject
                      </Button>
                    </>
                  ) : null}
                  <Button size="sm" variant="ghost" asChild>
                    <Link href={p.href}>View details</Link>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* Upcoming activity strip */}
      {hub.upcomingEvents.length > 0 ? (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-violet-500" />
              Upcoming ecosystem activity
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/company/events">All events</Link>
            </Button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
            {hub.upcomingEvents.map((ev) => (
              <Link
                key={ev.id}
                href={ev.href}
                className="min-w-[220px] shrink-0 rounded-2xl border bg-card p-4 transition hover:border-violet-500/35"
              >
                <Badge variant="secondary" className="text-[10px] mb-2">
                  {ev.typeLabel}
                </Badge>
                <p className="font-medium text-sm line-clamp-2">{ev.title}</p>
                <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">{ev.whenLabel}</p>
                <p className="text-[10px] text-muted-foreground mt-2">
                  {ev.universityName} · {ev.attendeeCount} attending
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Startup momentum */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Rocket className="h-5 w-5 text-cyan-600" />
              Startup momentum
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {hub.startupMomentum.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Follow startups in the{' '}
                <Link href="/company/startups" className="text-violet-600 underline">
                  Startup Hub
                </Link>{' '}
                to track innovation signals here.
              </p>
            ) : (
              hub.startupMomentum.map((s) => (
                <Link
                  key={s.id}
                  href={s.href}
                  className="flex items-center justify-between rounded-xl border px-4 py-3 hover:bg-muted/40"
                >
                  <div>
                    <p className="font-medium text-sm">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.founders}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-[10px]">
                      {s.momentumLabel}
                    </Badge>
                    <p className="text-[10px] text-muted-foreground mt-1">{s.stage}</p>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Pipeline movement */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Recent pipeline movement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {hub.pipelineActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Pipeline activity appears as you save and move talent.</p>
            ) : (
              hub.pipelineActivity.map((p) => (
                <Link
                  key={p.id}
                  href={p.href}
                  className="flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm hover:bg-muted/40"
                >
                  <span>{p.message}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                    {relativeTime(p.at)}
                  </span>
                </Link>
              ))
            )}
            <Button variant="ghost" size="sm" className="w-full mt-1" asChild>
              <Link href="/company/pipeline">
                Open pipeline
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <PartnershipEcosystemPanel viewer="company" title="University partnerships" />

      {loading ? (
        <div className="fixed bottom-6 right-6 rounded-full border bg-card p-3 shadow-lg">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : null}
    </div>
  );
}
