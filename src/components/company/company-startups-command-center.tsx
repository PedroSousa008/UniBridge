'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import type {
  CompanyStartupCard,
  CompanyStartupsEcosystemHub,
  CompanyStartupDetail,
} from '@/lib/company/company-startups-ecosystem-hub';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Bookmark,
  ExternalLink,
  GitCompare,
  GraduationCap,
  Loader2,
  Rocket,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  X,
  Zap,
} from 'lucide-react';

function MomentumRing({ value }: { value: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative h-11 w-11 shrink-0">
      <svg className="h-11 w-11 -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/30" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="url(#startupMom)"
          strokeWidth="3"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="startupMom" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold tabular-nums">
        {value}
      </span>
    </div>
  );
}

function ViewStartupButton({ url }: { url: string }) {
  return (
    <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700" asChild>
      <a href={url} target="_blank" rel="noopener noreferrer">
        View Startup <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </Button>
  );
}

function StartupEcosystemCard({
  card,
  rank,
  selected,
  compareOn,
  onSelect,
  onToggleCompare,
  onToggleFollow,
  onToggleBookmark,
  compact,
}: {
  card: CompanyStartupCard;
  rank?: number;
  selected?: boolean;
  compareOn?: boolean;
  onSelect: () => void;
  onToggleCompare: () => void;
  onToggleFollow: () => void;
  onToggleBookmark: () => void;
  compact?: boolean;
}) {
  const founderNames = card.founders.map((f) => f.name.split(' ')[0]).join(' · ') || 'Founder';

  return (
    <div
      className={cn(
        'group relative rounded-2xl border bg-gradient-to-br from-card via-card to-violet-500/5 p-4 shadow-sm transition-all duration-300',
        'hover:shadow-xl hover:border-violet-500/30 hover:-translate-y-0.5',
        selected && 'ring-2 ring-violet-500',
        compareOn && 'ring-2 ring-cyan-500/60'
      )}
    >
      {rank != null && (
        <span className="absolute -top-2 -left-2 flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white shadow">
          #{rank}
        </span>
      )}
      <button type="button" className="w-full text-left" onClick={onSelect}>
        <div className="flex gap-3">
          <div className="h-12 w-12 rounded-xl bg-muted overflow-hidden shrink-0 flex items-center justify-center">
            {card.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Rocket className="h-5 w-5 text-violet-500" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold truncate group-hover:text-violet-600 transition-colors">{card.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {founderNames} · {card.universityName ?? 'University'}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              <Badge variant="outline" className="text-[9px]">
                {card.category}
              </Badge>
              <Badge variant="secondary" className="text-[9px]">
                {card.stageLabel}
              </Badge>
            </div>
          </div>
          <MomentumRing value={card.momentumScore} />
        </div>
        {!compact && card.tagline && (
          <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{card.tagline}</p>
        )}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]">
          <div className="rounded-lg bg-muted/50 py-1.5">
            <p className="font-bold tabular-nums text-emerald-600">+{card.growthPercent}%</p>
            <p className="text-muted-foreground">Growth</p>
          </div>
          <div className="rounded-lg bg-muted/50 py-1.5">
            <p className="font-bold tabular-nums">+{card.followersGainedWeek}</p>
            <p className="text-muted-foreground">Followers/wk</p>
          </div>
          <div className="rounded-lg bg-muted/50 py-1.5">
            <p className="font-bold tabular-nums">{card.followers}</p>
            <p className="text-muted-foreground">Followers</p>
          </div>
        </div>
        <ul className="mt-2 space-y-0.5">
          {card.interestSignals.slice(0, 2).map((sig) => (
            <li key={sig} className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Zap className="h-3 w-3 text-amber-500 shrink-0" />
              {sig}
            </li>
          ))}
        </ul>
      </button>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Button
          type="button"
          size="sm"
          variant={card.isFollowed ? 'default' : 'outline'}
          className="h-7 text-[10px]"
          onClick={onToggleFollow}
        >
          {card.isFollowed ? 'Following' : 'Follow'}
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-7 px-2" onClick={onToggleBookmark}>
          <Bookmark className={cn('h-3 w-3', card.isBookmarked && 'fill-current')} />
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-7 text-[10px]" onClick={onToggleCompare}>
          <GitCompare className="h-3 w-3 mr-1" />
          Compare
        </Button>
        {card.websiteUrl ? <ViewStartupButton url={card.websiteUrl} /> : null}
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  icon: Icon,
}: {
  title: string;
  subtitle: string;
  icon: typeof Rocket;
}) {
  return (
    <div className="mb-4">
      <p className="flex items-center gap-2 text-lg font-semibold">
        <Icon className="h-5 w-5 text-violet-500" />
        {title}
      </p>
      <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
    </div>
  );
}

export function CompanyStartupsCommandCenter({
  initialHub,
}: {
  initialHub: CompanyStartupsEcosystemHub;
}) {
  const [hub, setHub] = useState(initialHub);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CompanyStartupDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<string | null>(null);
  const [uniFilter, setUniFilter] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    const res = await fetch(`/api/company/startups/${id}`);
    if (res.ok) setDetail(await res.json());
    setDetailLoading(false);
  }, []);

  const filterCards = useCallback(
    (cards: CompanyStartupCard[]) => {
      const q = search.trim().toLowerCase();
      return cards.filter((c) => {
        if (categoryFilter && !c.category.toLowerCase().includes(categoryFilter.toLowerCase())) {
          return false;
        }
        if (stageFilter && c.stageLabel !== stageFilter) return false;
        if (uniFilter && c.universityId !== uniFilter) return false;
        if (!q) return true;
        return (
          c.name.toLowerCase().includes(q) ||
          c.founders.some((f) => f.name.toLowerCase().includes(q)) ||
          (c.universityName?.toLowerCase().includes(q) ?? false)
        );
      });
    },
    [search, categoryFilter, stageFilter, uniFilter]
  );

  const discoverFiltered = useMemo(() => filterCards(hub.discover), [hub.discover, filterCards]);

  const compareCards = useMemo(
    () => hub.discover.filter((c) => compareIds.includes(c.id)),
    [hub.discover, compareIds]
  );

  async function toggle(startupId: string, action: 'follow' | 'bookmark') {
    const card = hub.discover.find((c) => c.id === startupId);
    if (!card) return;
    setBusy(true);
    const verb =
      action === 'follow'
        ? card.isFollowed
          ? 'unfollow'
          : 'follow'
        : card.isBookmarked
          ? 'unbookmark'
          : 'bookmark';
    const res = await fetch('/api/company/startups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startupId, action: verb }),
    });
    if (res.ok) {
      const next = await res.json();
      setHub(next);
      if (selectedId === startupId) void loadDetail(startupId);
    }
    setBusy(false);
  }

  function openStartup(id: string) {
    setSelectedId(id);
    void loadDetail(id);
  }

  if (!hub.hasPartnerships) {
    return (
      <div className="rounded-2xl border border-dashed p-12 text-center">
        <Rocket className="mx-auto h-12 w-12 text-muted-foreground/40" />
        <p className="mt-4 text-lg font-semibold">Activate university partnerships</p>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
          Startup Hub surfaces ventures from partner universities only — connect partnerships to discover
          founders before everyone else.
        </p>
        <Button className="mt-6" asChild>
          <Link href="/company/presence">Company Presence</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-950 to-cyan-950 px-6 py-10 text-white shadow-2xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-cyan-500/20 via-transparent to-transparent" />
        <div className="relative">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/50">
            Live innovation ecosystem
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{hub.heroTitle}</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/70">
            Not a directory — a living map of founders, traction, and AI potential across your partner
            universities. Connected to Talent, Pipeline, Events, and Startup OS.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {hub.heroMetrics.map((m) => (
              <div
                key={m.id}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm"
              >
                <p className="text-[10px] uppercase tracking-wider text-white/50">{m.label}</p>
                <p className="text-xl font-semibold tabular-nums">{m.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="space-y-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search startups, founders, universities…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategoryFilter(null)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition',
              !categoryFilter ? 'bg-violet-600 text-white' : 'bg-muted hover:bg-muted/80'
            )}
          >
            All sectors
          </button>
          {hub.filters.categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition',
                categoryFilter === cat ? 'bg-violet-600 text-white' : 'bg-muted hover:bg-muted/80'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {hub.filters.stages.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStageFilter(stageFilter === st ? null : st)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs transition',
                stageFilter === st ? 'border-violet-500 bg-violet-500/10' : 'hover:bg-muted/50'
              )}
            >
              {st}
            </button>
          ))}
          {hub.filters.universities.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => setUniFilter(uniFilter === u.id ? null : u.id)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs transition',
                uniFilter === u.id ? 'border-cyan-500 bg-cyan-500/10' : 'hover:bg-muted/50'
              )}
            >
              {u.name}
            </button>
          ))}
        </div>
      </section>

      {compareCards.length >= 2 && (
        <section className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-4">
          <p className="font-semibold flex items-center gap-2 text-sm">
            <GitCompare className="h-4 w-4" /> Startup comparison
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-left py-1 pr-4">Metric</th>
                  {compareCards.map((c) => (
                    <th key={c.id} className="text-left py-1 pr-4 font-medium text-foreground">
                      {c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    { label: 'AI momentum', fn: (c: CompanyStartupCard) => c.momentumScore },
                    { label: 'Growth %', fn: (c: CompanyStartupCard) => c.growthPercent },
                    { label: 'Followers', fn: (c: CompanyStartupCard) => c.followers },
                    { label: 'Team', fn: (c: CompanyStartupCard) => c.teamSize },
                    { label: 'Readiness', fn: (c: CompanyStartupCard) => c.readinessScore },
                    {
                      label: 'Scalability',
                      fn: (c: CompanyStartupCard) =>
                        c.ai.indicators.find((i) => i.id === 'scalability')?.score ?? '—',
                    },
                  ] as const
                ).map((row) => (
                  <tr key={row.label} className="border-t border-border/40">
                    <td className="py-2 pr-4 text-muted-foreground">{row.label}</td>
                    {compareCards.map((c) => (
                      <td key={c.id} className="py-2 pr-4 font-semibold tabular-nums">
                        {row.fn(c)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Best of the Month */}
      {filterCards(hub.bestOfMonth).length > 0 && (
        <section>
          <SectionHeader
            title="Best of the Month"
            subtitle="Partner-university ventures ranked by ecosystem score — not followers alone."
            icon={Sparkles}
          />
          <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
            {filterCards(hub.bestOfMonth).map((card, i) => (
              <div key={card.id} className="min-w-[280px] max-w-[300px] snap-start shrink-0">
                <StartupEcosystemCard
                  card={card}
                  rank={i + 1}
                  selected={selectedId === card.id}
                  compareOn={compareIds.includes(card.id)}
                  onSelect={() => openStartup(card.id)}
                  onToggleCompare={() =>
                    setCompareIds((ids) =>
                      ids.includes(card.id) ? ids.filter((x) => x !== card.id) : ids.length < 3 ? [...ids, card.id] : ids
                    )
                  }
                  onToggleFollow={() => void toggle(card.id, 'follow')}
                  onToggleBookmark={() => void toggle(card.id, 'bookmark')}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Highest Potential AI */}
      <section>
        <SectionHeader
          title="Highest Potential Based on AI"
          subtitle="Potential indicators — not predictions. Grounded in problem, market, and execution signals."
          icon={Sparkles}
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filterCards(hub.highestPotential).map((card) => (
            <StartupEcosystemCard
              key={card.id}
              card={card}
              selected={selectedId === card.id}
              compareOn={compareIds.includes(card.id)}
              onSelect={() => openStartup(card.id)}
              onToggleCompare={() =>
                setCompareIds((ids) =>
                  ids.includes(card.id) ? ids.filter((x) => x !== card.id) : ids.length < 3 ? [...ids, card.id] : ids
                )
              }
              onToggleFollow={() => void toggle(card.id, 'follow')}
              onToggleBookmark={() => void toggle(card.id, 'bookmark')}
            />
          ))}
        </div>
      </section>

      {/* Trending */}
      <section>
        <SectionHeader
          title="Trending This Week"
          subtitle="Momentum from visits, follows, saves, hiring, and founder activity."
          icon={TrendingUp}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filterCards(hub.trending).map((card) => (
            <StartupEcosystemCard
              key={card.id}
              card={card}
              compact
              selected={selectedId === card.id}
              onSelect={() => openStartup(card.id)}
              onToggleCompare={() =>
                setCompareIds((ids) =>
                  ids.includes(card.id) ? ids.filter((x) => x !== card.id) : ids.length < 3 ? [...ids, card.id] : ids
                )
              }
              onToggleFollow={() => void toggle(card.id, 'follow')}
              onToggleBookmark={() => void toggle(card.id, 'bookmark')}
            />
          ))}
        </div>
      </section>

      {/* Future Unicorn */}
      <section className="rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-500/5 to-cyan-500/5 p-6">
        <SectionHeader
          title="Future Unicorn Signals"
          subtitle="AI-detected unusual founder behavior, traction, and team signals — exploratory, not certainty."
          icon={Zap}
        />
        {filterCards(hub.futureUnicorn).length === 0 ? (
          <p className="text-sm text-muted-foreground">Signals will appear as founder activity accelerates.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filterCards(hub.futureUnicorn).map((card) => (
              <div key={card.id} className="rounded-xl border bg-card/80 p-4">
                <div className="flex justify-between gap-2">
                  <p className="font-semibold">{card.name}</p>
                  <MomentumRing value={card.momentumScore} />
                </div>
                <ul className="mt-2 space-y-1">
                  {card.ai.unicornSignals.map((sig) => (
                    <li key={sig} className="text-xs text-muted-foreground flex gap-1.5">
                      <Zap className="h-3 w-3 text-violet-500 shrink-0" />
                      {sig}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openStartup(card.id)}>
                    Explore
                  </Button>
                  {card.websiteUrl ? <ViewStartupButton url={card.websiteUrl} /> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Activity feed — followed/saved only */}
      {(hub.analytics.followed > 0 || hub.analytics.saved > 0) && (
        <section>
          <SectionHeader
            title="Your startup activity feed"
            subtitle="Updates from startups you follow or save — personalized, not noisy."
            icon={TrendingUp}
          />
          {hub.activityFeed.length === 0 ? (
            <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-6 text-center">
              No recent updates from your followed startups yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {hub.activityFeed.map((ev) => (
                <li
                  key={ev.id}
                  className="flex items-center justify-between rounded-xl border px-4 py-3 text-sm hover:bg-muted/30 transition"
                >
                  <div>
                    <p className="font-medium">{ev.label}</p>
                    <p className="text-xs text-muted-foreground">{ev.startupName}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(ev.at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* University rankings */}
      <section>
        <SectionHeader
          title="Top Universities by Startup Activity"
          subtitle="Rankings appear when partner universities activate their startup showcase (2+ active ventures)."
          icon={GraduationCap}
        />
        {!hub.rankingsActivated ? (
          <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-8 text-center">
            No university has activated startup rankings yet. Rankings are controlled by each partner
            university&apos;s innovation office.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {hub.universityRankings.map((u, i) => (
              <div key={u.universityId} className="rounded-xl border p-4 flex items-center gap-3">
                <span className="text-2xl font-bold text-violet-600 tabular-nums">#{i + 1}</span>
                <div>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {u.startupCount} startups · {u.activeFounders} founders
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Discover grid + detail */}
      <div className="grid gap-8 lg:grid-cols-5">
        <section className={cn('space-y-4', selectedId ? 'lg:col-span-2' : 'lg:col-span-5')}>
          <SectionHeader
            title="Discover ventures"
            subtitle={`${discoverFiltered.length} startups in your partner ecosystem`}
            icon={Rocket}
          />
          <div
            className={cn(
              'grid gap-4',
              selectedId ? 'grid-cols-1' : 'sm:grid-cols-2 xl:grid-cols-3'
            )}
          >
            {discoverFiltered.map((card) => (
              <StartupEcosystemCard
                key={card.id}
                card={card}
                selected={selectedId === card.id}
                compareOn={compareIds.includes(card.id)}
                onSelect={() => openStartup(card.id)}
                onToggleCompare={() =>
                  setCompareIds((ids) =>
                    ids.includes(card.id) ? ids.filter((x) => x !== card.id) : ids.length < 3 ? [...ids, card.id] : ids
                  )
                }
                onToggleFollow={() => void toggle(card.id, 'follow')}
                onToggleBookmark={() => void toggle(card.id, 'bookmark')}
              />
            ))}
          </div>
        </section>

        {selectedId && (
          <aside className="lg:col-span-3 space-y-4 animate-in slide-in-from-right-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Startup intelligence workspace</p>
              <Button type="button" variant="ghost" size="icon" onClick={() => { setSelectedId(null); setDetail(null); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {detailLoading && !detail ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : detail ? (
              <div className="space-y-4">
                <div className="rounded-2xl border p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold">{detail.card.name}</h3>
                      <p className="text-sm text-muted-foreground">{detail.card.tagline}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {detail.card.websiteUrl ? <ViewStartupButton url={detail.card.websiteUrl} /> : null}
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/company/talent?student=${detail.card.founders[0]?.userId}`}>
                            Talent profile
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <Link href="/company/pipeline">Pipeline</Link>
                        </Button>
                      </div>
                    </div>
                    <MomentumRing value={detail.card.momentumScore} />
                  </div>

                  <div className="mt-6">
                    <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
                      Why this startup has potential
                    </p>
                    <ul className="mt-2 space-y-1">
                      {detail.card.ai.whyPotential.map((line) => (
                        <li key={line} className="text-sm flex gap-2">
                          <Sparkles className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {detail.card.ai.indicators.map((ind) => (
                      <div key={ind.id} className="rounded-lg bg-muted/40 p-2 text-center">
                        <p className="text-[10px] text-muted-foreground">{ind.label}</p>
                        <p className="font-bold tabular-nums">{ind.score}</p>
                        <Badge variant="outline" className="mt-1 text-[9px] capitalize">
                          {ind.level}
                        </Badge>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 rounded-xl bg-muted/30 p-4">
                    <p className="text-sm font-semibold">AI potential projection</p>
                    <dl className="mt-2 grid gap-2 text-xs">
                      {Object.entries(detail.card.ai.projection).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-4 border-b border-border/30 pb-1">
                          <dt className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, ' $1')}</dt>
                          <dd className="text-right font-medium">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  <div className="mt-6">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <Users className="h-4 w-4" /> Founder ecosystem
                    </p>
                    <ul className="mt-2 space-y-2">
                      {detail.card.founders.map((f) => (
                        <li key={f.userId} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                          <div>
                            <p className="font-medium">{f.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {f.role} · {f.universityName}
                              {f.program ? ` · ${f.program}` : ''}
                            </p>
                          </div>
                          <Button size="sm" variant="ghost" asChild>
                            <Link href={`/company/talent?student=${f.userId}`}>Profile</Link>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {detail.card.openings.length > 0 && (
                    <div className="mt-6">
                      <p className="text-sm font-semibold">Team building — open roles</p>
                      <ul className="mt-2 space-y-2">
                        {detail.card.openings.map((o) => (
                          <li key={o.id} className="rounded-lg border px-3 py-2 text-sm">
                            <p className="font-medium">{o.role}</p>
                            {o.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">{o.description}</p>
                            )}
                            <Button size="sm" variant="ghost" className="h-auto p-0 mt-1" asChild>
                              <Link href={`/company/talent`}>Find talent on UniBridge</Link>
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-6 grid grid-cols-2 gap-2 text-xs">
                    {[
                      ['Team activity', detail.card.health.teamActivity],
                      ['Founder engagement', detail.card.health.founderEngagement],
                      ['Growth', detail.card.health.growthRate],
                      ['Networking', detail.card.health.networkingStrength],
                      ['Hiring', detail.card.health.hiringActivity],
                      ['Product evolution', detail.card.health.productEvolution],
                    ].map(([label, val]) => (
                      <div key={label as string} className="rounded-lg bg-muted/40 px-2 py-2">
                        <span className="text-muted-foreground">{label}</span>
                        <p className="font-bold tabular-nums">{val}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </aside>
        )}
      </div>

      <section className="rounded-2xl border bg-muted/20 p-5 flex flex-wrap gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/company/talent">
            <Users className="h-3 w-3 mr-1" /> Talent
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/company/pipeline">Pipeline</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/company/events">Events</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/company/opportunities">Opportunities</Link>
        </Button>
      </section>

      {busy && (
        <div className="fixed bottom-4 right-4 rounded-full bg-violet-600 text-white px-4 py-2 text-xs shadow-lg flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin" /> Updating…
        </div>
      )}
    </div>
  );
}
