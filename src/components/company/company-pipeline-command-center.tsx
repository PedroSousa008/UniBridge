'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AI_LABEL_COPY,
  TAG_COLORS,
  type PipelineFilters,
  type PipelineStageId,
} from '@/lib/company/company-pipeline-intelligence';
import type { CompanyPipelineHub, PipelineCard } from '@/lib/company/company-pipeline-hub';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Archive,
  ArrowRight,
  Bookmark,
  Calendar,
  Eye,
  GitCompare,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Pin,
  Rocket,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  UserPlus,
  X,
} from 'lucide-react';

const RECENT_SEARCH_KEY = 'unibridge-pipeline-recent';

function CompatRing({ value }: { value: number | null }) {
  const v = value ?? 0;
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;
  return (
    <div className="relative h-11 w-11 shrink-0">
      <svg className="h-11 w-11 -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/40" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="url(#compatGrad)"
          strokeWidth="3"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
        <defs>
          <linearGradient id="compatGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold tabular-nums">
        {value != null ? value : '—'}
      </span>
    </div>
  );
}

function PipelineStudentCard({
  card,
  selected,
  compareSelected,
  onSelect,
  onToggleCompare,
  onQuickAction,
  draggable,
  onDragStart,
}: {
  card: PipelineCard;
  selected: boolean;
  compareSelected: boolean;
  onSelect: () => void;
  onToggleCompare: () => void;
  onQuickAction: (action: string) => void;
  draggable?: boolean;
  onDragStart?: () => void;
}) {
  const stageMeta = card.stage.replace(/_/g, ' ');
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      className={cn(
        'group relative rounded-2xl border bg-gradient-to-br from-card via-card to-muted/20 p-4 shadow-sm transition-all duration-300',
        'hover:shadow-lg hover:border-brand/30 hover:-translate-y-0.5',
        selected && 'ring-2 ring-brand shadow-md',
        compareSelected && 'ring-2 ring-violet-500/60'
      )}
    >
      <button type="button" className="w-full text-left" onClick={onSelect}>
        <div className="flex gap-3">
          <div className="h-12 w-12 rounded-xl bg-muted overflow-hidden shrink-0 flex items-center justify-center">
            {card.candidate.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.candidate.image} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-lg font-medium text-muted-foreground">{card.candidate.name.charAt(0)}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{card.candidate.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {card.candidate.universityName}
                  {card.candidate.academicYear ? ` · ${card.candidate.academicYear}` : ''}
                </p>
              </div>
              <CompatRing value={card.candidate.compatibilityScore} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 truncate">
              {card.candidate.program ?? card.candidate.headline ?? 'Student'}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-[10px] capitalize">
            {stageMeta}
          </Badge>
          {card.isFollowed ? (
            <Badge className="text-[10px] bg-amber-500/15 text-amber-800 border-amber-500/30">Following</Badge>
          ) : null}
          {card.candidate.aiLabels.slice(0, 1).map((l) => (
            <Badge key={l} className="text-[10px] bg-violet-500/10 text-violet-700 border-violet-500/20">
              {AI_LABEL_COPY[l]}
            </Badge>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1 text-[10px]">
          <div className="rounded-lg bg-muted/50 px-2 py-1 text-center">
            <p className="font-semibold tabular-nums">{card.candidate.profileStrength}%</p>
            <p className="text-muted-foreground">Profile</p>
          </div>
          <div className="rounded-lg bg-muted/50 px-2 py-1 text-center">
            <p className="font-semibold tabular-nums">{card.candidate.employabilityScore}%</p>
            <p className="text-muted-foreground">Employ.</p>
          </div>
          <div className="rounded-lg bg-muted/50 px-2 py-1 text-center">
            <p className="font-semibold tabular-nums">{card.candidate.leadershipScore}%</p>
            <p className="text-muted-foreground">Lead.</p>
          </div>
        </div>

        {card.candidate.ecosystemSignals.length > 0 ? (
          <ul className="mt-3 space-y-1">
            {card.candidate.ecosystemSignals.slice(0, 2).map((sig) => (
              <li key={sig} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                {sig}
              </li>
            ))}
          </ul>
        ) : null}
      </button>

      <div className="mt-3 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2" onClick={() => onQuickAction('follow')}>
          <Star className={cn('h-3 w-3 mr-1', card.isFollowed && 'fill-amber-400 text-amber-500')} />
          {card.isFollowed ? 'Following' : 'Follow'}
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2" onClick={() => onQuickAction('message')}>
          <MessageCircle className="h-3 w-3 mr-1" />
          Message
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2" onClick={onToggleCompare}>
          <GitCompare className="h-3 w-3 mr-1" />
          Compare
        </Button>
      </div>
    </div>
  );
}

export function CompanyPipelineCommandCenter({ initialHub }: { initialHub: CompanyPipelineHub }) {
  const [hub, setHub] = useState(initialHub);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filters, setFilters] = useState<PipelineFilters>({});
  const [showArchived, setShowArchived] = useState(false);
  const [selected, setSelected] = useState<PipelineCard | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareData, setCompareData] = useState<PipelineCard[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [messageDraft, setMessageDraft] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [viewMode, setViewMode] = useState<'board' | 'search'>('board');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_SEARCH_KEY);
      if (raw) setRecentSearches(JSON.parse(raw) as string[]);
    } catch {
      /* */
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 280);
    return () => clearTimeout(t);
  }, [query]);

  const fetchHub = useCallback(
    async (opts?: { q?: string; silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      const params = new URLSearchParams();
      const q = opts?.q ?? debouncedQuery;
      if (q) params.set('q', q);
      if (showArchived) params.set('archived', '1');
      if (filters.minCompatibility) params.set('minCompatibility', String(filters.minCompatibility));
      if (filters.leadership) params.set('leadership', '1');
      if (filters.startup) params.set('startup', '1');
      if (filters.verified) params.set('verified', '1');
      if (filters.openToOpportunities) params.set('openToOpportunities', '1');
      if (filters.followed) params.set('followed', '1');
      if (filters.stage) params.set('stage', filters.stage);
      if (filters.tag) params.set('tag', filters.tag);

      const res = await fetch(`/api/company/pipeline?${params}`);
      if (res.ok) {
        const data = (await res.json()) as CompanyPipelineHub;
        setHub(data);
        if (selected) {
          const found = data.pipelinePool.find((c) => c.id === selected.id);
          if (found) setSelected(found);
        }
      }
      setLoading(false);
    },
    [debouncedQuery, showArchived, filters]
  );

  useEffect(() => {
    setViewMode(debouncedQuery ? 'search' : 'board');
    void fetchHub({ q: debouncedQuery, silent: true });
  }, [debouncedQuery, showArchived, filters]);

  const persistSearch = (term: string) => {
    if (!term.trim()) return;
    const next = [term, ...recentSearches.filter((s) => s !== term)].slice(0, 6);
    setRecentSearches(next);
    try {
      localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(next));
    } catch {
      /* */
    }
  };

  async function patchCard(pipelineId: string, body: Record<string, unknown>) {
    setHub((prev) => {
      const moveStage = body.stage as PipelineStageId | undefined;
      if (!moveStage) return prev;
      const card = prev.pipelinePool.find((c) => c.id === pipelineId);
      if (!card) return prev;
      const updated = { ...card, stage: moveStage };
      const columns = { ...prev.columns };
      for (const s of prev.stages) {
        columns[s.id] = columns[s.id].filter((c) => c.id !== pipelineId);
      }
      columns[moveStage] = [updated, ...columns[moveStage]];
      return {
        ...prev,
        columns,
        pipelinePool: prev.pipelinePool.map((c) => (c.id === pipelineId ? updated : c)),
      };
    });

    const res = await fetch('/api/company/pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipelineId, ...body, query: debouncedQuery, filters, includeArchived: showArchived }),
    });
    if (res.ok) setHub(await res.json());
  }

  async function moveCard(pipelineId: string, stage: PipelineStageId) {
    await patchCard(pipelineId, { stage });
  }

  async function toggleFollow(card: PipelineCard) {
    const res = await fetch('/api/company/pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pipelineId: card.id,
        isFollowed: !card.isFollowed,
        query: debouncedQuery,
        filters,
        includeArchived: showArchived,
      }),
    });
    if (res.ok) setHub(await res.json());
  }

  async function addNote() {
    if (!selected || !noteDraft.trim()) return;
    setLoading(true);
    await fetch('/api/company/pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_note',
        pipelineId: selected.id,
        note: noteDraft,
        query: debouncedQuery,
        filters,
      }),
    });
    setNoteDraft('');
    await fetchHub({ silent: true });
    setLoading(false);
  }

  async function runCompare() {
    if (compareIds.length < 2) return;
    setLoading(true);
    const res = await fetch(`/api/company/pipeline?compare=${compareIds.join(',')}`);
    if (res.ok) {
      const { compare } = await res.json();
      setCompareData(compare);
    }
    setLoading(false);
  }

  const analyticsCards = useMemo(
    () => [
      { label: 'Saved talent', value: hub.analytics.savedTalent, icon: Bookmark },
      { label: 'High compatibility', value: hub.analytics.highCompatibility, icon: Sparkles },
      { label: 'Future potential', value: hub.analytics.futurePotential, icon: Eye },
      { label: 'Startup founders', value: hub.analytics.startupFounders, icon: Rocket },
      { label: 'Leadership profiles', value: hub.analytics.leadershipProfiles, icon: TrendingUp },
      { label: 'Fastest growing', value: hub.analytics.fastestGrowing, icon: TrendingUp },
      { label: 'Open to opportunities', value: hub.analytics.openToOpportunities, icon: UserPlus },
      { label: 'High activity', value: hub.analytics.highActivity, icon: Sparkles },
    ],
    [hub.analytics]
  );

  const toggleFilter = (key: keyof PipelineFilters, value?: boolean | number | string) => {
    setFilters((f) => {
      const next = { ...f };
      if (key === 'minCompatibility' && typeof value === 'number') {
        next.minCompatibility = f.minCompatibility === value ? undefined : value;
      } else if (typeof value === 'boolean') {
        (next as Record<string, boolean | undefined>)[key] = (f as Record<string, boolean | undefined>)[key]
          ? undefined
          : value;
      }
      return next;
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Hero */}
      <section className="rounded-3xl border bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-8 text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-500/20 via-transparent to-transparent" />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.2em] text-white/60 mb-2">Talent operating space</p>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight max-w-2xl">
            Curating and monitoring the next generation of talent
          </h2>
          <p className="text-sm text-white/70 mt-2 max-w-xl">
            Connected to student profiles, compatibility, startups, events, and applications — live and evolving.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <Link href="/company/talent" className="rounded-full bg-white/10 px-3 py-1 hover:bg-white/20 transition">
              Talent discovery →
            </Link>
            <Link href="/company/presence" className="rounded-full bg-white/10 px-3 py-1 hover:bg-white/20 transition">
              Requirements & fit →
            </Link>
            <Link href="/company/events" className="rounded-full bg-white/10 px-3 py-1 hover:bg-white/20 transition">
              Events →
            </Link>
          </div>
        </div>
      </section>

      {/* Analytics */}
      <section className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
        {analyticsCards.map((a) => (
          <div
            key={a.label}
            className="rounded-2xl border bg-card/80 backdrop-blur p-3 transition hover:shadow-md hover:border-brand/20"
          >
            <a.icon className="h-4 w-4 text-brand mb-2" />
            <p className="text-xl font-bold tabular-nums">{a.value}</p>
            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{a.label}</p>
          </div>
        ))}
      </section>

      {/* Search */}
      <section className="relative">
        <div
          className={cn(
            'rounded-2xl border bg-card shadow-sm transition-all duration-300',
            searchFocused && 'ring-2 ring-brand/30 shadow-lg'
          )}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <Search className="h-5 w-5 text-brand shrink-0" />
            <Input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') persistSearch(query);
              }}
              placeholder="Search by name, university, skills, leadership, startup, compatibility…"
              className="border-0 shadow-none focus-visible:ring-0 text-base h-11"
            />
            {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
            {query ? (
              <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setQuery('')}>
                <X className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
          {(searchFocused || query) && (
            <div className="border-t px-4 py-3 space-y-3">
              <div className="flex flex-wrap gap-2">
                {hub.searchSuggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="rounded-full border border-brand/20 bg-brand/5 px-3 py-1 text-xs hover:bg-brand/10 transition"
                    onMouseDown={() => {
                      setQuery(s);
                      persistSearch(s);
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {recentSearches.length > 0 ? (
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Recent</p>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onMouseDown={() => setQuery(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>

      {/* Filters */}
      <section className="flex flex-wrap items-center gap-2">
        {[
          { key: 'minCompatibility' as const, label: '75%+ fit', value: 75 },
          { key: 'leadership' as const, label: 'Leadership', toggle: true },
          { key: 'startup' as const, label: 'Startup', toggle: true },
          { key: 'verified' as const, label: 'Verified', toggle: true },
          { key: 'openToOpportunities' as const, label: 'Open to roles', toggle: true },
          { key: 'followed' as const, label: 'Following', toggle: true },
        ].map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() =>
              f.key === 'minCompatibility'
                ? toggleFilter('minCompatibility', f.value)
                : toggleFilter(f.key, true)
            }
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition',
              (f.key === 'minCompatibility' && filters.minCompatibility === f.value) ||
                (f.toggle && (filters as Record<string, boolean>)[f.key])
                ? 'bg-brand text-white border-brand'
                : 'bg-muted/30 hover:bg-muted/50'
            )}
          >
            {f.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowArchived((v) => !v)}
          className={cn(
            'rounded-full border px-3 py-1.5 text-xs font-medium transition',
            showArchived ? 'bg-slate-800 text-white' : 'bg-muted/30'
          )}
        >
          <Archive className="h-3 w-3 inline mr-1" />
          Archived
        </button>
        {hub.defaultTags.slice(0, 5).map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => setFilters((f) => ({ ...f, tag: f.tag === tag ? undefined : tag }))}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs transition',
              filters.tag === tag && 'ring-2 ring-offset-1'
            )}
            style={{
              borderColor: TAG_COLORS[tag] ?? '#94a3b8',
              backgroundColor: filters.tag === tag ? `${TAG_COLORS[tag] ?? '#94a3b8'}22` : undefined,
            }}
          >
            {tag}
          </button>
        ))}
      </section>

      {/* AI sections */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-500" />
          <h3 className="font-semibold">AI talent prioritization</h3>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
          {hub.aiSections.map((section) => {
            const cards = section.pipelineIds
              .map((id) => hub.pipelinePool.find((c) => c.id === id))
              .filter(Boolean) as PipelineCard[];
            if (cards.length === 0) return null;
            return (
              <div
                key={section.id}
                className="min-w-[280px] max-w-[300px] shrink-0 snap-start rounded-2xl border bg-gradient-to-b from-violet-500/5 to-card p-4"
              >
                <p className="font-medium text-sm">{section.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{section.subtitle}</p>
                <div className="mt-3 space-y-2">
                  {cards.slice(0, 3).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelected(c)}
                      className="w-full flex items-center gap-2 rounded-xl border bg-card/80 px-3 py-2 text-left hover:border-brand/30 transition"
                    >
                      <CompatRing value={c.candidate.compatibilityScore} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{c.candidate.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{c.candidate.universityName}</p>
                      </div>
                      <ArrowRight className="h-3 w-3 ml-auto shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Board or search results */}
      {viewMode === 'search' ? (
        <section>
          <p className="text-sm text-muted-foreground mb-3">
            {hub.allCards.length} match{hub.allCards.length === 1 ? '' : 'es'} for &ldquo;{debouncedQuery}&rdquo;
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {hub.allCards.map((card) => (
              <PipelineStudentCard
                key={card.id}
                card={card}
                selected={selected?.id === card.id}
                compareSelected={compareIds.includes(card.id)}
                onSelect={() => setSelected(card)}
                onToggleCompare={() =>
                  setCompareIds((ids) =>
                    ids.includes(card.id) ? ids.filter((i) => i !== card.id) : ids.length < 4 ? [...ids, card.id] : ids
                  )
                }
                onQuickAction={(action) => {
                  if (action === 'follow') void toggleFollow(card);
                  if (action === 'message') setSelected(card);
                }}
              />
            ))}
          </div>
        </section>
      ) : (
        <section className="flex gap-4 overflow-x-auto pb-6 snap-x">
          {hub.stages
            .filter((s) => showArchived || s.id !== 'archived')
            .map((stage) => (
              <div
                key={stage.id}
                className="min-w-[300px] max-w-[320px] shrink-0 snap-start"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragId) void moveCard(dragId, stage.id);
                  setDragId(null);
                }}
              >
                <div
                  className="rounded-t-2xl px-4 py-3 border border-b-0"
                  style={{ backgroundColor: `${stage.color}18`, borderColor: `${stage.color}40` }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{stage.label}</p>
                      <p className="text-[10px] text-muted-foreground">{stage.description}</p>
                    </div>
                    <Badge variant="secondary" className="tabular-nums">
                      {hub.columns[stage.id]?.length ?? 0}
                    </Badge>
                  </div>
                </div>
                <div className="rounded-b-2xl border border-t-0 bg-muted/10 p-3 min-h-[320px] space-y-3">
                  {(hub.columns[stage.id] ?? []).map((card) => (
                    <PipelineStudentCard
                      key={card.id}
                      card={card}
                      selected={selected?.id === card.id}
                      compareSelected={compareIds.includes(card.id)}
                      onSelect={() => setSelected(card)}
                      onToggleCompare={() =>
                        setCompareIds((ids) =>
                          ids.includes(card.id)
                            ? ids.filter((i) => i !== card.id)
                            : ids.length < 4
                              ? [...ids, card.id]
                              : ids
                        )
                      }
                      onQuickAction={(action) => {
                        if (action === 'follow') void toggleFollow(card);
                        if (action === 'message') setSelected(card);
                      }}
                      draggable
                      onDragStart={() => setDragId(card.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
        </section>
      )}

      {/* Compare bar */}
      {compareIds.length > 0 ? (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-2xl border bg-card shadow-xl px-5 py-3">
          <GitCompare className="h-4 w-4 text-brand" />
          <span className="text-sm">{compareIds.length} selected for compare</span>
          <Button size="sm" onClick={() => void runCompare()} disabled={compareIds.length < 2}>
            Compare
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setCompareIds([]); setCompareData(null); }}>
            Clear
          </Button>
        </div>
      ) : null}

      {/* Compare modal */}
      {compareData && compareData.length >= 2 ? (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl border max-w-5xl w-full max-h-[90vh] overflow-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Talent comparison</h3>
              <Button variant="ghost" size="icon" onClick={() => setCompareData(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${compareData.length}, minmax(0, 1fr))` }}>
              {compareData.map((c) => (
                <div key={c.id} className="rounded-2xl border p-4 space-y-3">
                  <p className="font-semibold">{c.candidate.name}</p>
                  <p className="text-xs text-muted-foreground">{c.candidate.universityName}</p>
                  {[
                    ['Compatibility', `${c.candidate.compatibilityScore ?? '—'}%`],
                    ['Profile strength', `${c.candidate.profileStrength}%`],
                    ['Employability', `${c.candidate.employabilityScore}%`],
                    ['Leadership', `${c.candidate.leadershipScore}%`],
                    ['Networking', `${c.candidate.networkingScore}%`],
                    ['Growth', `+${c.candidate.growthPercent}%`],
                    ['Startup', c.candidate.startupInvolvement ?? '—'],
                    ['Languages', c.candidate.languages.join(', ') || '—'],
                    ['Events', String(c.candidate.eventParticipation.length)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs border-b pb-1">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-medium text-right">{v}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Detail panel */}
      {selected ? (
        <section className="rounded-3xl border bg-card shadow-lg overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-gradient-to-r from-muted/40 to-brand/5 px-6 py-5 flex flex-wrap items-start justify-between gap-4">
            <div className="flex gap-4">
              <div className="h-16 w-16 rounded-2xl bg-muted overflow-hidden">
                {selected.candidate.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selected.candidate.image} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div>
                <h3 className="text-xl font-semibold">{selected.candidate.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {selected.candidate.program} · {selected.candidate.universityName}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Link href={selected.talentHref} className="text-xs text-brand hover:underline">
                    Open in Talent →
                  </Link>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSelected(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-6 grid gap-8 lg:grid-cols-2">
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                {hub.stages.map((s) => (
                  <Button
                    key={s.id}
                    size="sm"
                    variant={selected.stage === s.id ? 'default' : 'outline'}
                    className="text-xs"
                    onClick={() => void moveCard(selected.id, s.id)}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Timeline</p>
                <ul className="space-y-2">
                  {selected.candidate.timeline.map((ev) => (
                    <li key={ev.id} className="flex gap-3 text-sm">
                      <span className="h-2 w-2 rounded-full bg-brand mt-2 shrink-0" />
                      <div>
                        <p className="font-medium">{ev.title}</p>
                        {ev.detail ? <p className="text-xs text-muted-foreground">{ev.detail}</p> : null}
                        <p className="text-[10px] text-muted-foreground">{new Date(ev.at).toLocaleDateString()}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium mb-2">Internal notes (never visible to students)</p>
                <ul className="space-y-2 mb-2 max-h-40 overflow-y-auto">
                  {selected.notes.map((n) => (
                    <li key={n.id} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                      {n.pinned ? <Pin className="h-3 w-3 inline mr-1 text-amber-500" /> : null}
                      {n.body}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {n.authorName} · {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
                <textarea
                  className="w-full min-h-[72px] rounded-xl border px-3 py-2 text-sm"
                  placeholder="Add a private note…"
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                />
                <Button size="sm" className="mt-2" onClick={() => void addNote()} disabled={loading}>
                  Add note
                </Button>
              </div>

              <Input
                placeholder="Send message to student…"
                value={messageDraft}
                onChange={(e) => setMessageDraft(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!messageDraft.trim()) return;
                    setLoading(true);
                    await fetch('/api/company/pipeline', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'message',
                        pipelineId: selected.id,
                        message: messageDraft,
                      }),
                    });
                    setMessageDraft('');
                    await fetchHub({ silent: true });
                    setLoading(false);
                  }}
                >
                  <MessageCircle className="h-3.5 w-3.5 mr-1" /> Message
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    const start = new Date();
                    start.setDate(start.getDate() + 3);
                    const end = new Date(start);
                    end.setHours(end.getHours() + 1);
                    setLoading(true);
                    await fetch('/api/company/pipeline', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'interview',
                        pipelineId: selected.id,
                        interview: { startAt: start.toISOString(), endAt: end.toISOString() },
                      }),
                    });
                    await fetchHub({ silent: true });
                    setLoading(false);
                  }}
                >
                  <Calendar className="h-3.5 w-3.5 mr-1" /> Schedule interview
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void toggleFollow(selected)}
                >
                  <Star className={cn('h-3.5 w-3.5 mr-1', selected.isFollowed && 'fill-amber-400')} />
                  {selected.isFollowed ? 'Following' : 'Follow'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    setLoading(true);
                    await fetch('/api/company/pipeline', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'archive', pipelineId: selected.id }),
                    });
                    setSelected(null);
                    await fetchHub({ silent: true });
                    setLoading(false);
                  }}
                >
                  <Archive className="h-3.5 w-3.5 mr-1" /> Archive
                </Button>
              </div>

              <div className="flex flex-wrap gap-1">
                {hub.defaultTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] border transition',
                      selected.tags.includes(tag) && 'ring-1'
                    )}
                    style={{ borderColor: TAG_COLORS[tag] }}
                    onClick={async () => {
                      const next = selected.tags.includes(tag)
                        ? selected.tags.filter((t) => t !== tag)
                        : [...selected.tags, tag];
                      const res = await fetch('/api/company/pipeline', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ pipelineId: selected.id, tags: next }),
                      });
                      if (res.ok) {
                        const data = await res.json();
                        setHub(data);
                        const found = data.pipelinePool.find((c: PipelineCard) => c.id === selected.id);
                        if (found) setSelected(found);
                      }
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {!hub.dbReady ? (
        <p className="text-sm text-amber-700 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          Pipeline database is initializing. Refresh in a moment — your ecosystem tables are being prepared.
        </p>
      ) : null}
    </div>
  );
}
