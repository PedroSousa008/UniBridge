'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Handshake,
  Radio,
  Search,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { STATE_LABELS, stateCtaForViewer } from '@/lib/partnerships/partnership-intelligence';
import type {
  PartnershipDiscoverCompany,
  PartnershipDiscoverUniversity,
  PartnershipEcosystemHub,
  PartnershipUiState,
} from '@/lib/partnerships/partnership-live-hub';

type Viewer = 'company' | 'university';

function StatePill({ state }: { state: PartnershipUiState }) {
  const variant =
    state === 'active'
      ? 'default'
      : state === 'mutual_interest'
        ? 'secondary'
        : 'outline';
  return (
    <Badge variant={variant} className="text-[10px] font-medium">
      {STATE_LABELS[state]}
    </Badge>
  );
}

function Logo({ url, name }: { url: string | null; name: string }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <Building2 className="h-5 w-5 text-muted-foreground" />
      )}
    </div>
  );
}

export function PartnershipEcosystemPanel({
  viewer,
  title,
}: {
  viewer: Viewer;
  title: string;
}) {
  const [hub, setHub] = useState<PartnershipEcosystemHub | null>(null);
  const [discover, setDiscover] = useState<
    (PartnershipDiscoverUniversity | PartnershipDiscoverCompany)[]
  >([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [interestLoading, setInterestLoading] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);

  const refreshHub = useCallback(async () => {
    const res = await fetch('/api/partnerships/hub');
    if (res.ok) {
      const data = (await res.json()) as PartnershipEcosystemHub;
      setHub(data);
    }
    setLoading(false);
  }, []);

  const runDiscover = useCallback(
    async (q: string) => {
      setSearching(true);
      const res = await fetch(`/api/partnerships/discover?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setDiscover(data.results ?? []);
      }
      setSearching(false);
    },
    []
  );

  useEffect(() => {
    void refreshHub();
    void runDiscover('');
  }, [refreshHub, runDiscover]);

  useEffect(() => {
    const t = setTimeout(() => {
      void runDiscover(query);
    }, 280);
    return () => clearTimeout(t);
  }, [query, runDiscover]);

  useEffect(() => {
    const es = new EventSource('/api/partnerships/stream');
    es.onopen = () => setLiveConnected(true);
    es.onerror = () => setLiveConnected(false);
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as { type?: string };
        if (data.type === 'mutual_match' || data.type === 'partnership_active') {
          setCelebrate(true);
          setTimeout(() => setCelebrate(false), 4200);
        }
        if (
          data.type === 'interest' ||
          data.type === 'mutual_match' ||
          data.type === 'partnership_active' ||
          data.type === 'hub_refresh'
        ) {
          void refreshHub();
          void runDiscover(query);
        }
      } catch {
        /* ignore */
      }
    };
    return () => es.close();
  }, [refreshHub, runDiscover, query]);

  const expressInterest = async (targetId: string) => {
    setInterestLoading(targetId);
    const body =
      viewer === 'company'
        ? { universityId: targetId }
        : { companyUserId: targetId };
    const res = await fetch('/api/partnerships/interest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const result = await res.json();
      if (result.activated) {
        setCelebrate(true);
        setTimeout(() => setCelebrate(false), 4200);
      }
      await refreshHub();
      await runDiscover(query);
    }
    setInterestLoading(null);
  };

  const sectionTitle = viewer === 'company' ? 'University Partnerships' : 'Company Partnerships';

  const pendingCount = hub?.pending.length ?? 0;

  const discoverCards = useMemo(() => {
    return discover.map((item) => {
      const isCompany = viewer === 'university';
      const id = isCompany
        ? (item as PartnershipDiscoverCompany).companyUserId
        : (item as PartnershipDiscoverUniversity).universityId;
      const uiState = item.uiState;
      const cta = stateCtaForViewer(uiState, viewer);

      return (
        <div
          key={id}
          className="rounded-2xl border border-border/60 bg-card/80 p-4 transition hover:border-brand/30 hover:shadow-md"
        >
          <div className="flex gap-3">
            <Logo
              url={isCompany ? (item as PartnershipDiscoverCompany).logoUrl : (item as PartnershipDiscoverUniversity).logoUrl}
              name={isCompany ? (item as PartnershipDiscoverCompany).name : (item as PartnershipDiscoverUniversity).name}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold tracking-tight truncate">
                  {isCompany
                    ? (item as PartnershipDiscoverCompany).name
                    : (item as PartnershipDiscoverUniversity).name}
                </p>
                <StatePill state={uiState} />
              </div>
              {viewer === 'company' ? (
                <UniversityPreview item={item as PartnershipDiscoverUniversity} />
              ) : (
                <CompanyPreview item={item as PartnershipDiscoverCompany} />
              )}
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            {cta.action === 'connected' ? (
              <Button size="sm" variant="secondary" disabled className="gap-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Partnered
              </Button>
            ) : cta.action === 'waiting' ? (
              <Button size="sm" variant="outline" disabled>
                {cta.label}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="brand"
                disabled={interestLoading === id}
                className="gap-1"
                onClick={() => void expressInterest(id)}
              >
                <Handshake className="h-4 w-4" />
                {interestLoading === id ? 'Sending…' : cta.label}
              </Button>
            )}
          </div>
        </div>
      );
    });
  }, [discover, viewer, interestLoading, expressInterest]);

  if (loading && !hub) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Loading partnership ecosystem…
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative space-y-6">
      {celebrate ? (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-300">
          <div className="rounded-3xl border bg-card px-10 py-8 text-center shadow-2xl animate-in zoom-in-95 duration-500">
            <Sparkles className="mx-auto h-10 w-10 text-brand mb-3" />
            <p className="text-xl font-semibold">Partnership live</p>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs">
              Ecosystem connected — students, opportunities, and analytics are syncing now.
            </p>
          </div>
        </div>
      ) : null}

      <Card className="overflow-hidden border-brand/20 bg-gradient-to-br from-card via-card to-muted/30">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Handshake className="h-5 w-5 text-brand" />
              {title || sectionTitle}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  'gap-1 text-[10px]',
                  liveConnected && 'border-emerald-500/50 text-emerald-700 dark:text-emerald-400'
                )}
              >
                <Radio className={cn('h-3 w-3', liveConnected && 'animate-pulse')} />
                Live
              </Badge>
              {pendingCount > 0 ? (
                <Badge variant="secondary" className="tabular-nums">
                  {pendingCount} pending
                </Badge>
              ) : null}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Mutual confirmation — when both sides express interest, the partnership activates instantly across UniBridge.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder={
                viewer === 'company'
                  ? 'Search universities…'
                  : 'Search companies…'
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Discover
              </p>
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {searching && discover.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Searching ecosystem…</p>
                ) : null}
                {discoverCards}
                {!searching && discover.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No matches — try another name or location.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Active partners
              </p>
              <ul className="space-y-2">
                {(hub?.active ?? []).map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 rounded-xl border bg-emerald-500/5 border-emerald-500/20 px-3 py-2.5"
                  >
                    <Logo url={p.logoUrl} name={p.name} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.subtitle}</p>
                    </div>
                    <Zap className="h-4 w-4 text-emerald-600 shrink-0" />
                  </li>
                ))}
                {(hub?.active ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-4">
                    Active partnerships unlock talent, events, and student access automatically.
                  </p>
                ) : null}
              </ul>

              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground pt-2">
                Pending signals
              </p>
              <ul className="space-y-2">
                {(hub?.pending ?? []).map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 rounded-xl border px-3 py-2.5 animate-in fade-in slide-in-from-right-2 duration-300"
                  >
                    <Logo url={p.logoUrl} name={p.name} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.subtitle}</p>
                    </div>
                    <StatePill state={p.uiState} />
                  </li>
                ))}
                {(hub?.pending ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No pending interest signals.</p>
                ) : null}
              </ul>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Suggested
              </p>
              <div className="flex flex-wrap gap-2">
                {(hub?.suggested ?? []).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      const id = s.universityId ?? s.companyUserId;
                      if (id) void expressInterest(id);
                    }}
                    className="rounded-full border px-3 py-1.5 text-xs font-medium hover:bg-muted/60 transition"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Recent activity
              </p>
              <ul className="space-y-1.5 max-h-28 overflow-y-auto">
                {(hub?.recentActivity ?? []).slice(0, 5).map((a) => (
                  <li key={a.id} className="text-xs text-muted-foreground leading-snug">
                    {a.message}
                  </li>
                ))}
                {(hub?.recentActivity ?? []).length === 0 ? (
                  <li className="text-xs text-muted-foreground">Ecosystem activity appears here in real time.</li>
                ) : null}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UniversityPreview({ item }: { item: PartnershipDiscoverUniversity }) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
      <span>
        {item.city}, {item.country}
      </span>
      <span>{item.totalStudents.toLocaleString()} students</span>
      <span>Employability: {item.employabilityLevel}</span>
      <span>Startups: {item.startupActivity}</span>
      <span className="col-span-2 truncate">
        Degrees: {item.strongestDegrees.join(' · ') || '—'}
      </span>
      <span>{item.activePartnerships} active partnerships</span>
    </div>
  );
}

function CompanyPreview({ item }: { item: PartnershipDiscoverCompany }) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
      <span>{item.industry ?? 'Industry'}</span>
      <span>{item.country}</span>
      <span>{item.opportunitiesCount} opportunities</span>
      <span>{item.eventsHosted} events</span>
      <span>Startups: {item.startupInvolvement}</span>
      <span>{item.hiringActivity}</span>
      <span>{item.partnershipCount} partnerships</span>
    </div>
  );
}
